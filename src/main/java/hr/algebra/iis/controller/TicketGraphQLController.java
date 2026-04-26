package hr.algebra.iis.controller;

import hr.algebra.iis.model.Ticket;
import hr.algebra.iis.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class TicketGraphQLController {

    private final TicketService ticketService;

    @QueryMapping
    public List<Ticket> tickets() {
        return ticketService.findAll();
    }

    @QueryMapping
    public Ticket ticket(@Argument Long id) {
        return ticketService.findById(id);
    }

    @MutationMapping
    public Boolean deleteTicket(@Argument Long id) {
        ticketService.deleteById(id);
        return true;
    }
}