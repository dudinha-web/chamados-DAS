package br.com.sistemas.chamados.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.sistemas.chamados.dto.AlterarStatusRequest;
import br.com.sistemas.chamados.dto.AtribuirTecnicoRequest;
import br.com.sistemas.chamados.dto.ChamadoRequest;
import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.entity.Categoria;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Cliente;
import br.com.sistemas.chamados.entity.StatusChamado;
import br.com.sistemas.chamados.entity.Tecnico;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.exception.RegraNegocioException;
import br.com.sistemas.chamados.repository.ChamadoRepository;

@Service
public class ChamadoService {

    private final ChamadoRepository repository;
    private final ClienteService clienteService;
    private final CategoriaService categoriaService;
    private final TecnicoService tecnicoService;

    public ChamadoService(ChamadoRepository repository, ClienteService clienteService,
                          CategoriaService categoriaService, TecnicoService tecnicoService) {
        this.repository = repository;
        this.clienteService = clienteService;
        this.categoriaService = categoriaService;
        this.tecnicoService = tecnicoService;
    }

    @Transactional
    public ChamadoResponse criar(ChamadoRequest dto) {
        // buscarEntity lança 404 se o cliente/categoria não existir
        Cliente cliente = clienteService.buscarEntity(dto.clienteId());
        Categoria categoria = categoriaService.buscarEntity(dto.categoriaId());
        Chamado chamado = new Chamado(dto.titulo(), dto.descricao(), dto.prioridade(), cliente, categoria);
        return ChamadoResponse.de(repository.save(chamado));
    }

    @Transactional(readOnly = true)
    public List<ChamadoResponse> listar() {
        return repository.findAll().stream().map(ChamadoResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public ChamadoResponse buscar(Long id) {
        return ChamadoResponse.de(buscarEntity(id));
    }

    /** PUT altera os dados descritivos. O cliente que abriu o chamado não muda. */
    @Transactional
    public ChamadoResponse atualizar(Long id, ChamadoRequest dto) {
        Chamado chamado = buscarEntity(id);
        garantirNaoFechado(chamado, "alterar");
        if (!chamado.getCliente().getId().equals(dto.clienteId())) {
            throw new RegraNegocioException("Não é permitido trocar o cliente de um chamado");
        }
        chamado.setTitulo(dto.titulo());
        chamado.setDescricao(dto.descricao());
        chamado.setPrioridade(dto.prioridade());
        chamado.setCategoria(categoriaService.buscarEntity(dto.categoriaId()));
        return ChamadoResponse.de(chamado);
    }

    @Transactional
    public void excluir(Long id) {
        repository.delete(buscarEntity(id));
    }

    /** PATCH /chamados/{id}/atribuir */
    @Transactional
    public ChamadoResponse atribuirTecnico(Long id, AtribuirTecnicoRequest dto) {
        Chamado chamado = buscarEntity(id);
        garantirNaoFechado(chamado, "atribuir técnico a");
        Tecnico tecnico = tecnicoService.buscarEntity(dto.tecnicoId());
        chamado.setTecnico(tecnico);
        return ChamadoResponse.de(chamado);
    }

    /** PATCH /chamados/{id}/status */
    @Transactional
    public ChamadoResponse alterarStatus(Long id, AlterarStatusRequest dto) {
        Chamado chamado = buscarEntity(id);
        garantirNaoFechado(chamado, "alterar o status de");
        StatusChamado novo = dto.status();

        if (novo == chamado.getStatus()) {
            throw new RegraNegocioException("O chamado já está com status " + novo);
        }
        if (novo == StatusChamado.ABERTO) {
            throw new RegraNegocioException("Um chamado não pode voltar para ABERTO");
        }
        if (novo == StatusChamado.EM_ATENDIMENTO && chamado.getTecnico() == null) {
            throw new RegraNegocioException("Atribua um técnico antes de iniciar o atendimento");
        }

        chamado.setStatus(novo);
        if (novo == StatusChamado.FECHADO) {
            chamado.setDataFechamento(LocalDateTime.now());
        }
        return ChamadoResponse.de(chamado);
    }

    private void garantirNaoFechado(Chamado chamado, String acao) {
        if (chamado.getStatus() == StatusChamado.FECHADO) {
            throw new RegraNegocioException(
                "Não é possível " + acao + " um chamado FECHADO");
        }
    }

    public Chamado buscarEntity(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException(
                "Chamado " + id + " não encontrado"));
    }
}
