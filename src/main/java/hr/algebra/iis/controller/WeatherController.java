package hr.algebra.iis.controller;

import hr.algebra.iis.grpc.WeatherProto;
import hr.algebra.iis.grpc.WeatherServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/weather")
@CrossOrigin(origins = "http://localhost:8080")
public class WeatherController {

    record WeatherResult(String city, String temperature, String humidity) {}

    @GetMapping("/{city}")
    public ResponseEntity<List<WeatherResult>> getWeather(@PathVariable String city) {
        ManagedChannel channel = ManagedChannelBuilder
                .forAddress("localhost", 9090)
                .usePlaintext()
                .build();
        try {
            WeatherServiceGrpc.WeatherServiceBlockingStub stub = WeatherServiceGrpc.newBlockingStub(channel);
            WeatherProto.WeatherResponse response = stub.getTemperature(
                    WeatherProto.WeatherRequest.newBuilder().setCity(city).build());

            List<WeatherResult> results = response.getResultsList().stream()
                    .map(d -> new WeatherResult(d.getCity(), d.getTemperature(), d.getHumidity()))
                    .toList();

            return ResponseEntity.ok(results);
        } finally {
            channel.shutdown();
        }
    }
}