from __future__ import annotations

from typing import Optional

import pandas as pd
from datasets import load_dataset

from .config import DATASET_ID


def load_split(split: str) -> pd.DataFrame:

    if split not in {"train", "eval"}:
        raise ValueError("split must be 'train' or 'eval'")

    dataset = load_dataset(
        DATASET_ID,
        split=split,
    )

    columns = [
        "first_category_id",
        "dt",
        "sale_amount",
    ]

    df = dataset.select_columns(columns).to_pandas()

    df["dt"] = pd.to_datetime(df["dt"], errors="coerce")
    df["sale_amount"] = pd.to_numeric(
        df["sale_amount"], errors="coerce"
    )

    df = df.dropna(
        subset=["first_category_id", "dt", "sale_amount"]
    )

    daily = (
        df.groupby(
            ["first_category_id", "dt"],
            as_index=False,
        )["sale_amount"]
        .sum()
        .rename(columns={"sale_amount": "demand"})
        .sort_values(["first_category_id", "dt"])
    )

    return daily.reset_index(drop=True)


def get_common_categories(
    train: pd.DataFrame,
    evaluation: pd.DataFrame,
    max_categories: Optional[int] = None,
) -> list[int]:
    eval_categories = set(
        evaluation["first_category_id"].astype(int).unique()
    )

    ranked = (
        train.groupby("first_category_id")["demand"]
        .sum()
        .sort_values(ascending=False)
    )

    categories = [
        int(category_id)
        for category_id in ranked.index
        if int(category_id) in eval_categories
    ]

    if max_categories:
        categories = categories[:max_categories]

    return categories
