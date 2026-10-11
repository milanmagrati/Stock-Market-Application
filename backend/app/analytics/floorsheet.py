from typing import List, Dict, Any, Optional
from collections import defaultdict
from app.models.market_data import Floorsheet

def summarize_floorsheets(floorsheet_records: List[Floorsheet]) -> Dict[str, Any]:
    """
    Computes broker-level buy/sell breakdown, net accumulation, and turnover.
    """
    if not floorsheet_records:
        return {
            "date": None,
            "top_buyers": [],
            "top_sellers": [],
            "total_transactions": 0,
            "total_volume": 0,
            "total_turnover": 0.0
        }

    broker_stats = defaultdict(lambda: {"buy_quantity": 0, "sell_quantity": 0, "total_amount": 0.0})
    total_vol = 0
    total_amount = 0.0
    latest_date = max(r.date for r in floorsheet_records)

    # Filter to latest date where floorsheet is available for clear intraday snapshot
    target_records = [r for r in floorsheet_records if r.date == latest_date]
    if not target_records:
        target_records = floorsheet_records

    for r in target_records:
        total_vol += r.quantity
        total_amount += r.amount

        # Buyer broker
        b = broker_stats[r.buyer_broker]
        b["buy_quantity"] += r.quantity
        b["total_amount"] += r.amount

        # Seller broker
        s = broker_stats[r.seller_broker]
        s["sell_quantity"] += r.quantity
        s["total_amount"] += r.amount

    # Compute net and format
    summary_list = []
    for broker_name, stat in broker_stats.items():
        net = stat["buy_quantity"] - stat["sell_quantity"]
        summary_list.append({
            "broker": broker_name,
            "buy_quantity": stat["buy_quantity"],
            "sell_quantity": stat["sell_quantity"],
            "net_quantity": net,
            "total_amount": round(stat["total_amount"], 2)
        })

    # Top buyers sorted by net quantity descending
    top_buyers = sorted(
        [b for b in summary_list if b["buy_quantity"] > 0],
        key=lambda x: x["buy_quantity"],
        reverse=True
    )[:5]

    # Top sellers sorted by sell quantity descending
    top_sellers = sorted(
        [s for s in summary_list if s["sell_quantity"] > 0],
        key=lambda x: x["sell_quantity"],
        reverse=True
    )[:5]

    return {
        "date": latest_date,
        "top_buyers": top_buyers,
        "top_sellers": top_sellers,
        "total_transactions": len(target_records),
        "total_volume": total_vol,
        "total_turnover": round(total_amount, 2)
    }
