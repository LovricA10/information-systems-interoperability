package hr.algebra.iis.service;

import hr.algebra.iis.model.Ticket;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class XmlValidationService {

    private final Validator validator;
    private final TicketService ticketService;

    public List<String> validateGeneratedXml() {
        List<String> messages = new ArrayList<>();
        try {
            String xmlContent = ticketService.generateTicketsXml();

            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new ByteArrayInputStream(xmlContent.getBytes()));

            NodeList ticketNodes = doc.getElementsByTagName("ticket");

            if (ticketNodes.getLength() == 0) {
                messages.add("UPOZORENJE: XML ne sadrži niti jedan tiket");
                return messages;
            }

            for (int i = 0; i < ticketNodes.getLength(); i++) {
                Element ticketEl = (Element) ticketNodes.item(i);
                String id = ticketEl.getAttribute("id");

                Ticket ticket = Ticket.builder()
                        .subject(getElementText(ticketEl, "subject"))
                        .description(getElementText(ticketEl, "description"))
                        .status(getElementText(ticketEl, "status"))
                        .priority(getElementText(ticketEl, "priority"))
                        .requesterEmail(getElementText(ticketEl, "requesterEmail"))
                        .build();

                Set<ConstraintViolation<Ticket>> violations = validator.validate(ticket);
                if (violations.isEmpty()) {
                    messages.add("Tiket ID=" + id + ": VALIDAN ");
                } else {
                    for (ConstraintViolation<Ticket> v : violations) {
                        messages.add("Tiket ID=" + id + " - GREŠKA: " + v.getPropertyPath() + " " + v.getMessage());
                    }
                }
            }

        } catch (Exception e) {
            messages.add("Greška pri validaciji: " + e.getMessage());
        }
        return messages;
    }

    private String getElementText(Element parent, String tagName) {
        NodeList nodes = parent.getElementsByTagName(tagName);
        return nodes.getLength() > 0 ? nodes.item(0).getTextContent() : "";
    }
}