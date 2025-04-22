/**
 * @author yummy
 * @version 1.0
 */
package lisa.rag.dev.tech.app;
import org.springframework.beans.factory.annotation.Configurable;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

import javax.swing.*;

@SpringBootApplication
@Configurable
@ComponentScan(basePackages = {"lisa.rag.dev.tech"})

public class Application {
    public static void main(String[] args){
        SpringApplication.run(Application.class);
    }
}
