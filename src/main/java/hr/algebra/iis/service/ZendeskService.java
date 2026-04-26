package hr.algebra.iis.service;

import hr.algebra.iis.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class ZendeskService {

    @Value("${app.use-public-api}")
    private boolean usePublicApi;

    @Value("${app.zendesk.base-url}")
    private String zendeskBaseUrl;

    @Value("${app.zendesk.email}")
    private String zendeskEmail;

    @Value("${app.zendesk.token}")
    private String zendeskToken;

    private final TicketRepository ticketRepository;

    public Object getTickets() {
        if (usePublicApi) {
            return getFromZendesk("/tickets");
        } else {
            return ticketRepository.findAll();
        }
    }

    private Object getFromZendesk(String path) {
        String credentials = zendeskEmail + ":" + zendeskToken;
        String encoded = java.util.Base64.getEncoder().encodeToString(credentials.getBytes());

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + encoded);

        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> response = restTemplate.exchange(
                zendeskBaseUrl + path,
                HttpMethod.GET,
                entity,
                Map.class
        );
        return response.getBody();
    }
}