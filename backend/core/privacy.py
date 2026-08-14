def project_coordinates(
    latitude: float | None,
    longitude: float | None,
    *,
    precise: bool,
) -> dict[str, float] | None:
    if latitude is None or longitude is None:
        return None
    if precise:
        return {"lat": latitude, "lng": longitude}
    return {"lat": round(latitude, 2), "lng": round(longitude, 2)}
