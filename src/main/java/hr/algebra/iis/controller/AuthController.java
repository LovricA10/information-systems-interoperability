package hr.algebra.iis.controller;

import hr.algebra.iis.model.Role;
import hr.algebra.iis.model.User;
import hr.algebra.iis.security.JwtService;
import hr.algebra.iis.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:8080", allowCredentials = "true")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String role = body.getOrDefault("role", "READ_ONLY");

        if (userService.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Korisnik već postoji"));
        }

        User user = userService.createUser(username, password, Role.valueOf(role));
        return ResponseEntity.ok(Map.of(
                "message", "Korisnik kreiran",
                "username", user.getUsername(),
                "role", user.getRole()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body,
                                   HttpServletResponse response) {
        String username = body.get("username");
        String password = body.get("password");

        User user = userService.findByUsername(username).orElse(null);

        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Pogrešno korisničko ime ili lozinka"));
        }

        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getUsername());

        Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(7 * 24 * 60 * 60);
        response.addCookie(refreshCookie);

        return ResponseEntity.ok(Map.of(
                "accessToken", accessToken,
                "role", user.getRole().name()
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request) {
        String refreshToken = null;
        if (request.getCookies() != null) {
            refreshToken = Arrays.stream(request.getCookies())
                    .filter(c -> "refreshToken".equals(c.getName()))
                    .map(Cookie::getValue)
                    .findFirst()
                    .orElse(null);
        }

        if (refreshToken == null || !jwtService.isTokenValid(refreshToken)) {
            return ResponseEntity.status(401).body(Map.of("error", "Refresh token nije valjan"));
        }

        String username = jwtService.validateToken(refreshToken).getSubject();
        User user = userService.findByUsername(username).orElseThrow();
        String newAccessToken = jwtService.generateAccessToken(username, user.getRole().name());
        return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("refreshToken", "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "Odjavljeni ste"));
    }
}