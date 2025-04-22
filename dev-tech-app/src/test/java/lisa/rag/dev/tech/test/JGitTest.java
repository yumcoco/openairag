package lisa.rag.dev.tech.test;

import jakarta.annotation.Resource;
import lisa.rag.dev.tech.app.Application;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.ai.document.Document;
import org.springframework.ai.ollama.OllamaChatClient;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.PgVectorStore;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.PathResource;
import org.springframework.test.context.junit4.SpringRunner;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.List;
import java.util.stream.Collectors;


@Slf4j
@RunWith(SpringRunner.class)
@SpringBootTest(classes = Application.class)

public class JGitTest {
    @Resource
    private OllamaChatClient ollamaChatClient;
    @Resource
    private TokenTextSplitter tokenTextSplitter;
    @Resource
    private SimpleVectorStore simpleVectorStore;
    @Resource
    private PgVectorStore pgVectorStore;

    @Test
    public void test() throws Exception {
        String repoURL = "https://github.com/yumcoco/Muggle2wizard";
        String username = "yumcoco";
        String password = "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";

        String localPath = "./cloned-repo";
        log.info("Clone Path:" + new File(localPath).getAbsolutePath());

        FileUtils.deleteDirectory(new File(localPath));

        Git git = Git.cloneRepository()
                .setURI(repoURL)
                .setDirectory(new File(localPath))
                .setCredentialsProvider(new UsernamePasswordCredentialsProvider(username,password))
                .call();

        git.close();

    }

    @Test
    public  void test_file() throws IOException {
        Files.walkFileTree(Paths.get("./cloned-repo"), new SimpleFileVisitor<>(){
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws  IOException{
                log.info("File Path:{}", file.toString());
                PathResource resource = new PathResource(file);

                TikaDocumentReader reader = new TikaDocumentReader(resource);

//                List<Document> documents = reader.get();
                List<Document> rawDocuments;
                try {
                    rawDocuments = reader.get();
                } catch (Exception e) {
                    log.warn("Failed to parse file: {} - skipping. Reason: {}", file.toString(), e.getMessage());
                    return FileVisitResult.CONTINUE;
                }

                if (rawDocuments == null || rawDocuments.isEmpty()) {
                    log.warn("Parsed no content from file: {} - skipping.", file.toString());
                    return FileVisitResult.CONTINUE;
                }

                List<Document> documents = rawDocuments.stream()
                        .filter(doc -> doc.getContent() != null && !doc.getContent().trim().isEmpty())
                        .collect(Collectors.toList());

                if (documents.isEmpty()) {
                    log.warn("All documents were empty after filtering: {}", file.toString());
                    return FileVisitResult.CONTINUE;
                }


                List<Document> documentSplitterList = tokenTextSplitter.apply(documents);

                documents.forEach(doc -> doc.getMetadata().put("knowledge", "Muggle2wizard"));
                documentSplitterList.forEach(doc -> doc.getMetadata().put("knowledge", "Muggle2wizard"));

                pgVectorStore.accept(documentSplitterList);
                return FileVisitResult.CONTINUE;
            }
        });
    }

}
