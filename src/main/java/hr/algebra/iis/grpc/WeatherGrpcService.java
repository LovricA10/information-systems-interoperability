package hr.algebra.iis.grpc;

import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.net.URL;

@GrpcService
public class WeatherGrpcService extends WeatherServiceGrpc.WeatherServiceImplBase {

    private static final String DHMZ_URL = "https://vrijeme.hr/hrvatska_n.xml";

    @Override
    public void getTemperature(WeatherProto.WeatherRequest request,
                               StreamObserver<WeatherProto.WeatherResponse> responseObserver) {
        String cityQuery = request.getCity().toLowerCase();
        WeatherProto.WeatherResponse.Builder responseBuilder = WeatherProto.WeatherResponse.newBuilder();

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new URL(DHMZ_URL).openStream());
            doc.getDocumentElement().normalize();

            NodeList gradovi = doc.getElementsByTagName("Grad");
            for (int i = 0; i < gradovi.getLength(); i++) {
                Element grad = (Element) gradovi.item(i);
                String imeGrada = getTagValue("GradIme", grad);

                if (imeGrada != null && imeGrada.toLowerCase().contains(cityQuery)) {
                    String temperatura = getTagValue("Temp", grad);
                    String vlaga = getTagValue("Vlaga", grad);

                    WeatherProto.WeatherData data = WeatherProto.WeatherData.newBuilder()
                            .setCity(imeGrada)
                            .setTemperature(temperatura != null ? temperatura + "°C" : "N/A")
                            .setHumidity(vlaga != null ? vlaga + "%" : "N/A")
                            .build();
                    responseBuilder.addResults(data);
                }
            }

        } catch (Exception e) {
            System.err.println("Greška pri dohvatu DHMZ podataka: " + e.getMessage());
        }

        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }

    private String getTagValue(String tag, Element element) {
        NodeList nodes = element.getElementsByTagName(tag);
        if (nodes.getLength() > 0) {
            return nodes.item(0).getTextContent().trim();
        }
        return null;
    }
}