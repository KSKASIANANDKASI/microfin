package com.microfin.lms.common;

import com.microfin.lms.config.AppProperties;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/**
 * Encrypts government ID numbers (Aadhaar, PAN, ...) before they reach the database, with
 * AES-GCM and a fresh nonce per value. A database dump alone therefore does not expose them.
 * Stored form: base64(nonce || ciphertext+tag).
 */
@Component
@Converter
public class IdNumberCipher implements AttributeConverter<String, String> {

	private static final int NONCE_BYTES = 12;
	private static final int TAG_BITS = 128;

	private final SecretKeySpec key;
	private final SecureRandom random = new SecureRandom();

	public IdNumberCipher(AppProperties properties) {
		this.key = new SecretKeySpec(Base64.getDecoder().decode(properties.kyc().encryptionKey()), "AES");
	}

	@Override
	public String convertToDatabaseColumn(String plain) {
		if (plain == null) {
			return null;
		}
		try {
			byte[] nonce = new byte[NONCE_BYTES];
			random.nextBytes(nonce);
			Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
			cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
			byte[] sealed = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
			return Base64.getEncoder().encodeToString(ByteBuffer.allocate(nonce.length + sealed.length).put(nonce).put(sealed).array());
		} catch (GeneralSecurityException e) {
			throw new IllegalStateException("Could not encrypt ID number", e);
		}
	}

	@Override
	public String convertToEntityAttribute(String stored) {
		if (stored == null) {
			return null;
		}
		try {
			byte[] bytes = Base64.getDecoder().decode(stored);
			Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
			cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, bytes, 0, NONCE_BYTES));
			return new String(cipher.doFinal(bytes, NONCE_BYTES, bytes.length - NONCE_BYTES), StandardCharsets.UTF_8);
		} catch (GeneralSecurityException | IllegalArgumentException e) {
			throw new IllegalStateException("Could not decrypt ID number (was the KYC key changed?)", e);
		}
	}
}
