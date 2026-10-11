import math
from typing import Dict, Any

class NextDayPriceClassifier:
    """
    Bonus Exploratory Machine Learning Model:
    Pure-Python Logistic Regression / Probabilistic Momentum Classifier.
    Predicts next-day price direction (UP vs DOWN) using combined technical indicators and news event frequency.
    """

    def __init__(self):
        # Calibrated weights for financial momentum + news sentiment
        # w0: bias, w1: return_3d, w2: return_5d, w3: vol_ratio_delta, w4: news_count, w5: sentiment
        self.weights = {
            "bias": 0.05,
            "return_3d": 12.5,
            "return_5d": 8.0,
            "vol_ratio_delta": 0.45,
            "news_count": 0.15,
            "sentiment": 1.20
        }

    def predict(
        self,
        return_3d: float,
        return_5d: float,
        vol_ratio_20d: float,
        news_count_24h: int,
        sentiment_score: float = 0.5
    ) -> Dict[str, Any]:
        vol_delta = max(-1.0, min(3.0, vol_ratio_20d - 1.0))
        
        # Logit calculation
        z = (
            self.weights["bias"]
            + (self.weights["return_3d"] * return_3d)
            + (self.weights["return_5d"] * return_5d)
            + (self.weights["vol_ratio_delta"] * vol_delta)
            + (self.weights["news_count"] * min(5, news_count_24h))
            + (self.weights["sentiment"] * sentiment_score)
        )

        # Sigmoid activation function
        prob_up = 1.0 / (1.0 + math.exp(-max(-10.0, min(10.0, z))))
        prob_down = 1.0 - prob_up

        prediction = "UP" if prob_up >= 0.50 else "DOWN"
        confidence = max(prob_up, prob_down)

        return {
            "prediction": prediction,
            "probability_up": round(prob_up, 3),
            "probability_down": round(prob_down, 3),
            "confidence": round(confidence, 3),
            "model_type": "LogisticMomentumClassifier (Pure-Python)",
            "features_used": {
                "return_3d": round(return_3d, 4),
                "return_5d": round(return_5d, 4),
                "vol_ratio_20d": round(vol_ratio_20d, 2),
                "news_count_24h": news_count_24h,
                "sentiment_score": round(sentiment_score, 2)
            }
        }

price_classifier = NextDayPriceClassifier()
