from decimal import Decimal
from filters import apply_filters


def test_model_multi_select_matches_any(make_listing):
    ls = [make_listing(nft_address="1", model="Red Eye"), make_listing(nft_address="2", model="Pink Cup"),
          make_listing(nft_address="3", model="Blue Sky")]
    got = apply_filters(ls, ["red eye", "Blue"], None, None, attrs={})
    assert [l.nft_address for l in got] == ["1", "3"]


def test_price_range_and_backdrop(make_listing):
    ls = [make_listing(nft_address="1", price_ton=Decimal("3"), attributes={"Backdrop": "Black"}),
          make_listing(nft_address="2", price_ton=Decimal("9"), attributes={"Backdrop": "Black"}),
          make_listing(nft_address="3", price_ton=Decimal("4"), attributes={"Backdrop": "Ivory"})]
    got = apply_filters(ls, None, 2, 5, attrs={}, backdrop=["Black"])
    assert [l.nft_address for l in got] == ["1"]


def test_empty_filters_return_everything(make_listing):
    ls = [make_listing(nft_address=str(i)) for i in range(3)]
    assert apply_filters(ls, [], None, None, attrs={}) == ls
