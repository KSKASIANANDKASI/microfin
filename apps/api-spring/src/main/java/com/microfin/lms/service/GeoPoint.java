package com.microfin.lms.service;

import java.math.BigDecimal;

/** A latitude/longitude pair, with great-circle distance. */
public record GeoPoint(double lat, double lng) {

	private static final double EARTH_RADIUS_KM = 6371;

	/** Null when either coordinate is missing. */
	public static GeoPoint of(BigDecimal lat, BigDecimal lng) {
		return lat == null || lng == null ? null : new GeoPoint(lat.doubleValue(), lng.doubleValue());
	}

	public double distanceKm(GeoPoint other) {
		double dLat = Math.toRadians(other.lat - lat);
		double dLng = Math.toRadians(other.lng - lng);
		double h = Math.pow(Math.sin(dLat / 2), 2)
				+ Math.cos(Math.toRadians(lat)) * Math.cos(Math.toRadians(other.lat)) * Math.pow(Math.sin(dLng / 2), 2);
		return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
	}
}
