from models import NFTListing


def apply_filters(
    listings: list[NFTListing],
    model: str | None,
    min_ton: float | None,
    max_ton: float | None,
    attrs: dict,
    backdrop: str | None = None,
) -> list[NFTListing]:
    result = listings

    if model:
        model_lower = model.lower()
        result = [
            l for l in result
            if l.model and model_lower in l.model.lower()
        ]

    if min_ton is not None:
        result = [l for l in result if float(l.price_ton) >= min_ton]

    if max_ton is not None:
        result = [l for l in result if float(l.price_ton) <= max_ton]

    if backdrop:
        result = [l for l in result if l.attributes.get("Backdrop") == backdrop]

    for attr_key, attr_val in attrs.items():
        attr_val_lower = attr_val.lower()
        result = [
            l for l in result
            if attr_key in l.attributes
            and attr_val_lower in str(l.attributes[attr_key]).lower()
        ]

    return result
