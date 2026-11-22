from models import NFTListing


def apply_filters(
    listings: list[NFTListing],
    model: str | list[str] | None,
    min_ton: float | None,
    max_ton: float | None,
    attrs: dict,
    backdrop: str | list[str] | None = None,
) -> list[NFTListing]:
    # model/backdrop: одна строка (бот, темы) или список (мультивыбор в приложении).
    # Для списка подходит лот, совпавший с ЛЮБЫМ из значений; правило совпадения то же.
    result = listings

    models = [model] if isinstance(model, str) else [m for m in (model or []) if m]
    if models:
        models_lower = [m.lower() for m in models]
        result = [
            l for l in result
            if l.model and any(m in l.model.lower() for m in models_lower)
        ]

    if min_ton is not None:
        result = [l for l in result if float(l.price_ton) >= min_ton]

    if max_ton is not None:
        result = [l for l in result if float(l.price_ton) <= max_ton]

    backdrops = {backdrop} if isinstance(backdrop, str) else {b for b in (backdrop or []) if b}
    if backdrops:
        result = [l for l in result if l.attributes.get("Backdrop") in backdrops]

    for attr_key, attr_val in attrs.items():
        attr_val_lower = attr_val.lower()
        result = [
            l for l in result
            if attr_key in l.attributes
            and attr_val_lower in str(l.attributes[attr_key]).lower()
        ]

    return result
