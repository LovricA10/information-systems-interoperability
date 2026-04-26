package hr.algebra.iis.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import hr.algebra.iis.model.Ticket;
import hr.algebra.iis.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final ValidationService validationService;
    private final ObjectMapper objectMapper;

    public Ticket saveFromXml(String xmlContent) throws Exception {
        List<String> errors = validationService.validateXml(xmlContent);
        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("XML validacija neuspješna: " + String.join(", ", errors));
        }
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new org.xml.sax.InputSource(new StringReader(xmlContent)));

        return ticketRepository.save(Ticket.builder()
                .subject(doc.getElementsByTagName("subject").item(0).getTextContent())
                .description(doc.getElementsByTagName("description").item(0).getTextContent())
                .status(doc.getElementsByTagName("status").item(0).getTextContent())
                .priority(doc.getElementsByTagName("priority").item(0).getTextContent())
                .requesterEmail(doc.getElementsByTagName("requesterEmail").item(0).getTextContent())
                .build());
    }

    public Ticket saveFromJson(String jsonContent) throws Exception {
        List<String> errors = validationService.validateJson(jsonContent);
        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("JSON validacija neuspješna: " + String.join(", ", errors));
        }
        Map<String, String> data = objectMapper.readValue(jsonContent, Map.class);
        return ticketRepository.save(Ticket.builder()
                .subject(data.get("subject"))
                .description(data.get("description"))
                .status(data.get("status"))
                .priority(data.get("priority"))
                .requesterEmail(data.get("requesterEmail"))
                .build());
    }

    public List<Ticket> findAll() {
        return ticketRepository.findAll();
    }

    public Ticket findById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tiket s ID-om " + id + " nije pronađen"));
    }

    public String generateTicketsXml() throws Exception {
        List<Ticket> tickets = ticketRepository.findAll();
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.newDocument();

        Element root = doc.createElement("tickets");
        doc.appendChild(root);

        for (Ticket t : tickets) {
            Element ticketEl = doc.createElement("ticket");
            ticketEl.setAttribute("id", String.valueOf(t.getId()));
            addElement(doc, ticketEl, "subject", t.getSubject());
            addElement(doc, ticketEl, "description", t.getDescription());
            addElement(doc, ticketEl, "status", t.getStatus());
            addElement(doc, ticketEl, "priority", t.getPriority());
            addElement(doc, ticketEl, "requesterEmail", t.getRequesterEmail());
            root.appendChild(ticketEl);
        }

        TransformerFactory tf = TransformerFactory.newInstance();
        Transformer transformer = tf.newTransformer();
        StringWriter writer = new StringWriter();
        transformer.transform(new DOMSource(doc), new StreamResult(writer));
        return writer.toString();
    }

    private void addElement(Document doc, Element parent, String tagName, String value) {
        Element el = doc.createElement(tagName);
        el.setTextContent(value);
        parent.appendChild(el);
    }

    public void deleteById(Long id) {
        ticketRepository.deleteById(id);
    }

    public Ticket update(Long id, Ticket updated) {
        Ticket ticket = findById(id);
        ticket.setSubject(updated.getSubject());
        ticket.setDescription(updated.getDescription());
        ticket.setStatus(updated.getStatus());
        ticket.setPriority(updated.getPriority());
        ticket.setRequesterEmail(updated.getRequesterEmail());
        return ticketRepository.save(ticket);
    }
}