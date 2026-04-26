package hr.algebra.iis.config;

import hr.algebra.iis.soap.TicketSoapService;
import jakarta.xml.ws.Endpoint;
import org.apache.cxf.Bus;
import org.apache.cxf.jaxws.EndpointImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SoapConfig {

    @Bean
    public Endpoint ticketEndpoint(Bus bus, TicketSoapService ticketSoapService) {
        EndpointImpl endpoint = new EndpointImpl(bus, ticketSoapService);
        endpoint.publish("/tickets");
        return endpoint;
    }
}
