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

            NodeList cities = doc.getElementsByTagName("Grad");
            for (int i = 0; i < cities.getLength(); i++) {
                Element city = (Element) cities.item(i);
                String cityName = getTagValue("GradIme", city);

                if (cityName != null && cityName.toLowerCase().contains(cityQuery)) {
                    String temperature = getTagValue("Temp", city);
                    String humidity = getTagValue("Vlaga", city);

                    WeatherProto.WeatherData data = WeatherProto.WeatherData.newBuilder()
                            .setCity(cityName)
                            .setTemperature(temperature != null ? temperature + "°C" : "N/A")
                            .setHumidity(humidity != null ? humidity + "%" : "N/A")
                            .build();
                    responseBuilder.addResults(data);
                }
            }

        } catch (Exception e) {
            System.err.println("Error fetching DHMZ data: " + e.getMessage());
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