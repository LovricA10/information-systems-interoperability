package hr.algebra.iis.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Naslov ne smije biti prazan")
    @Size(min = 3, max = 200)
    @Column(nullable = false)
    private String subject;

    @NotBlank(message = "Opis ne smije biti prazan")
    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Pattern(regexp = "open|pending|solved|closed")
    @Column(nullable = false)
    private String status;

    @Pattern(regexp = "low|normal|high|urgent")
    @Column(nullable = false)
    private String priority;

    @Email
    @NotBlank
    @Column(nullable = false)
    private String requesterEmail;
}