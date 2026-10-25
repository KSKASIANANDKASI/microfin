package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.config.AppProperties;
import com.microfin.lms.domain.Company;
import com.microfin.lms.domain.StoredFile;
import com.microfin.lms.repo.StoredFileRepository;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Keeps uploaded KYC images on local disk, one folder per company, under names the server
 * chooses. Swap this class for an object-store client when running more than one instance.
 */
@Component
public class FileStorage {

	private static final Logger log = LoggerFactory.getLogger(FileStorage.class);

	private final Path root;
	private final StoredFileRepository files;
	private final Clock clock;

	public FileStorage(AppProperties properties, StoredFileRepository files, Clock clock) {
		this.root = properties.storage().dir().toAbsolutePath().normalize();
		this.files = files;
		this.clock = clock;
	}

	/** Stores an image. The type is decided from the file's first bytes, not from what the client claims. */
	public StoredFile saveImage(Company company, Long uploadedBy, MultipartFile upload) {
		byte[] bytes;
		try {
			bytes = upload.getBytes();
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
		ImageType type = ImageType.sniff(bytes);
		if (type == null) {
			throw ApiException.badRequest("NOT_AN_IMAGE", "Upload a JPEG, PNG or WebP photo of the ID");
		}
		UUID id = UUID.randomUUID();
		String relative = company.getId() + "/" + id + "." + type.extension;
		Path target = root.resolve(relative);
		try {
			Files.createDirectories(target.getParent());
			Files.write(target, bytes);
		} catch (IOException e) {
			throw new UncheckedIOException("Could not store the upload", e);
		}

		StoredFile file = new StoredFile();
		file.setId(id);
		file.setCompany(company);
		file.setOriginalName(safeName(upload.getOriginalFilename(), type));
		file.setContentType(type.contentType);
		file.setSizeBytes(bytes.length);
		file.setStoragePath(relative);
		file.setUploadedBy(uploadedBy);
		file.setCreatedAt(clock.instant());
		return files.save(file);
	}

	public Resource open(StoredFile file) {
		Path path = root.resolve(file.getStoragePath()).normalize();
		if (!path.startsWith(root) || !Files.isReadable(path)) {
			throw ApiException.notFound("File");
		}
		return new FileSystemResource(path);
	}

	/** Removes a replaced image. A leftover file on disk is harmless, so failure is only logged. */
	public void delete(StoredFile file) {
		files.delete(file);
		try {
			Files.deleteIfExists(root.resolve(file.getStoragePath()).normalize());
		} catch (IOException e) {
			log.warn("Could not delete stored file {}", file.getId(), e);
		}
	}

	/** The original name is only ever shown back, never used as a path; keep it short and printable. */
	private static String safeName(String original, ImageType type) {
		String name = original == null ? "" : original.replaceAll("[^A-Za-z0-9._ -]", "_");
		name = name.substring(Math.max(0, name.length() - 100));
		return name.isBlank() ? "id-proof." + type.extension : name;
	}

	private enum ImageType {
		JPEG("image/jpeg", "jpg"), PNG("image/png", "png"), WEBP("image/webp", "webp");

		final String contentType;
		final String extension;

		ImageType(String contentType, String extension) {
			this.contentType = contentType;
			this.extension = extension;
		}

		static ImageType sniff(byte[] b) {
			if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
				return JPEG;
			}
			if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
				return PNG;
			}
			if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E'
					&& b[10] == 'B' && b[11] == 'P') {
				return WEBP;
			}
			return null;
		}
	}
}
