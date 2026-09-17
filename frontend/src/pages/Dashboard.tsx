import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";

import type { Inventory } from "../types/inventory";
import type { Transaction } from "../types/transaction";

import { getInventory } from "../services/inventoryApi";
import { getTransactions } from "../services/transactionApi";

import type { AIPrediction } from "../services/aiPredictionApi";
import { getAIPredictions } from "../services/aiPredictionApi";


function Dashboard() {
  const tenantId = 3;

  // Existing dashboard data
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // AI prediction data
  const [aiPredictions, setAIPredictions] = useState<AIPrediction[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");


  // ---------------------------------------------------------
  // LOAD DASHBOARD DATA
  // ---------------------------------------------------------

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [
        inventoryData,
        transactionData,
        aiPredictionData,
      ] = await Promise.all([
        getInventory(tenantId),
        getTransactions(tenantId),
        getAIPredictions(),
      ]);

      setInventory(inventoryData);
      setTransactions(transactionData);
      setAIPredictions(aiPredictionData);

    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data.");

    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadDashboard();
  }, []);


  // ---------------------------------------------------------
  // INVENTORY / EXPIRY CALCULATIONS
  // ---------------------------------------------------------

  const {
    totalItems,
    totalStock,
    expiredItems,
    expiringSoonItems,
  } = useMemo(() => {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let stockSum = 0;

    const expiredList: Inventory[] = [];
    const expiringSoonList: Inventory[] = [];


    inventory.forEach((item) => {

      stockSum += item.quantity;


      const expiryDate = new Date(item.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);


      const diffTime =
        expiryDate.getTime() - today.getTime();


      const daysRemaining = Math.ceil(
        diffTime / (1000 * 60 * 60 * 24)
      );


      if (daysRemaining < 0) {

        expiredList.push(item);

      } else if (
        daysRemaining <= item.expiry_threshold_days
      ) {

        expiringSoonList.push(item);
      }
    });


    return {
      totalItems: inventory.length,
      totalStock: stockSum,
      expiredItems: expiredList,
      expiringSoonItems: expiringSoonList,
    };

  }, [inventory]);


  // ---------------------------------------------------------
  // EXISTING DASHBOARD STATISTICS
  // ---------------------------------------------------------

  const stats = [
    {
      title: "Total Items",
      value: totalItems.toLocaleString(),
      description: "Inventory items registered",
      accent: "border-slate-200 text-slate-900",
    },

    {
      title: "Total Stock",
      value: totalStock.toLocaleString(),
      description: "Units currently in stock",
      accent:
        "border-emerald-500 text-emerald-700 bg-emerald-50/40",
    },

    {
      title: "Expiring Soon",
      value: expiringSoonItems.length.toString(),
      description: "Requires immediate action",
      accent:
        "border-amber-400 text-amber-700 bg-amber-50/40",
    },

    {
      title: "Expired",
      value: expiredItems.length.toString(),
      description: "Pending removal or disposal",
      accent:
        "border-rose-500 text-rose-700 bg-rose-50/40",
    },
  ];


  // ---------------------------------------------------------
  // AI STATISTICS
  // ---------------------------------------------------------

  const lowRiskCount = aiPredictions.filter(
    (item) => item.risk_level === "LOW"
  ).length;


  const mediumRiskCount = aiPredictions.filter(
    (item) => item.risk_level === "MEDIUM"
  ).length;


  const highRiskCount = aiPredictions.filter(
    (item) => item.risk_level === "HIGH"
  ).length;


  const totalRecommendedPurchase =
    aiPredictions.reduce(
      (sum, item) =>
        sum +
        Number(
          item.recommended_purchase_quantity || 0
        ),
      0
    );


  // ---------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">

        <div className="flex flex-col items-center gap-2">

          <div
            className="
              h-8 w-8
              animate-spin
              rounded-full
              border-4
              border-emerald-600
              border-t-transparent
            "
          />

          <p className="text-sm font-medium text-slate-500">
            Loading dashboard...
          </p>

        </div>

      </div>
    );
  }


  // ---------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          flex
          flex-col
          gap-1
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >

        <div>

          <h1
            className="
              text-2xl
              font-bold
              tracking-tight
              text-slate-900
            "
          >
            Dashboard
          </h1>

          <p className="text-sm text-slate-500">
            Overview of your operations and inventory alerts.
          </p>

        </div>

      </div>


      {/* =====================================================
          ERROR ALERT
      ===================================================== */}

      {error && (
        <div
          className="
            rounded-xl
            border
            border-rose-200
            bg-rose-50
            p-4
            text-sm
            font-medium
            text-rose-700
            shadow-sm
          "
        >
          {error}
        </div>
      )}


      {/* =====================================================
          EXISTING STATISTICS
      ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {stats.map((stat) => (

          <div
            key={stat.title}
            className={`
              rounded-xl
              border
              p-5
              shadow-sm
              transition-all
              hover:shadow-md
              ${stat.accent}
            `}
          >

            <p
              className="
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-slate-500
              "
            >
              {stat.title}
            </p>

            <p
              className="
                mt-2
                text-3xl
                font-extrabold
                tracking-tight
              "
            >
              {stat.value}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {stat.description}
            </p>

          </div>

        ))}

      </div>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-3">


        {/* ===================================================
            AI PREDICTION OVERVIEW
        =================================================== */}

        <div className="space-y-4 lg:col-span-3">

          {/* AI HEADER */}

          <div>

            <h2
              className="
                text-lg
                font-bold
                text-slate-900
              "
            >
              AI Waste & Demand Intelligence
            </h2>

            <p className="text-sm text-slate-500">
              Prophet-based demand forecasting, waste-risk
              detection and smart reorder recommendations.
            </p>

          </div>


          {/* =================================================
              AI SUMMARY CARDS
          ================================================= */}

          <div
            className="
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-4
            "
          >


            {/* AI PREDICTIONS */}

            <div
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                p-5
                shadow-sm
              "
            >

              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-slate-500
                "
              >
                AI Predictions
              </p>

              <p
                className="
                  mt-2
                  text-3xl
                  font-extrabold
                  text-slate-900
                "
              >
                {aiPredictions.length}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Inventory items analyzed
              </p>

            </div>


            {/* HIGH RISK */}

            <div
              className="
                rounded-xl
                border
                border-rose-200
                bg-rose-50/40
                p-5
                shadow-sm
              "
            >

              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-rose-600
                "
              >
                High Risk
              </p>

              <p
                className="
                  mt-2
                  text-3xl
                  font-extrabold
                  text-rose-700
                "
              >
                {highRiskCount}
              </p>

              <p className="mt-1 text-xs text-rose-600">
                Immediate attention
              </p>

            </div>


            {/* MEDIUM RISK */}

            <div
              className="
                rounded-xl
                border
                border-amber-200
                bg-amber-50/40
                p-5
                shadow-sm
              "
            >

              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-amber-600
                "
              >
                Medium Risk
              </p>

              <p
                className="
                  mt-2
                  text-3xl
                  font-extrabold
                  text-amber-700
                "
              >
                {mediumRiskCount}
              </p>

              <p className="mt-1 text-xs text-amber-600">
                Requires review
              </p>

            </div>


            {/* RECOMMENDED PURCHASE */}

            <div
              className="
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50/40
                p-5
                shadow-sm
              "
            >

              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-emerald-600
                "
              >
                Recommended Purchase
              </p>

              <p
                className="
                  mt-2
                  text-3xl
                  font-extrabold
                  text-emerald-700
                "
              >
                {totalRecommendedPurchase.toLocaleString(
                  undefined,
                  {
                    maximumFractionDigits: 2,
                  }
                )}
              </p>

              <p className="mt-1 text-xs text-emerald-600">
                Total recommended units
              </p>

            </div>

          </div>


          {/* =================================================
              AI PREDICTION TABLE
          ================================================= */}

          <div
            className="
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >

            {/* TABLE HEADER */}

            <div
              className="
                border-b
                border-slate-100
                p-5
              "
            >

              <h3
                className="
                  text-base
                  font-semibold
                  text-slate-900
                "
              >
                AI Inventory Predictions
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Latest demand forecast, waste risk and
                reorder recommendations.
              </p>

            </div>


            {/* EMPTY STATE */}

            {aiPredictions.length === 0 ? (

              <div
                className="
                  p-8
                  text-center
                  text-sm
                  text-slate-500
                "
              >
                No AI predictions available yet.
              </div>

            ) : (

              /* TABLE */

              <div className="overflow-x-auto">

                <table
                  className="
                    w-full
                    min-w-[760px]
                    text-sm
                  "
                >

                  {/* TABLE HEAD */}

                  <thead className="bg-slate-50">

                    <tr
                      className="
                        text-left
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wider
                        text-slate-500
                      "
                    >

                      <th className="px-5 py-3">
                        Inventory
                      </th>

                      <th className="px-5 py-3">
                        Demand / Day
                      </th>

                      <th className="px-5 py-3">
                        Risk Score
                      </th>

                      <th className="px-5 py-3">
                        Risk Level
                      </th>

                      <th className="px-5 py-3">
                        Recommended Purchase
                      </th>

                    </tr>

                  </thead>


                  {/* TABLE BODY */}

                  <tbody
                    className="
                      divide-y
                      divide-slate-100
                    "
                  >

                    {aiPredictions
                      .slice(0, 10)
                      .map((prediction) => {

                        const riskClasses =
                          prediction.risk_level === "HIGH"
                            ? "bg-rose-100 text-rose-700"
                            : prediction.risk_level === "MEDIUM"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700";


                        return (

                          <tr
                            key={prediction.id}
                            className="
                              hover:bg-slate-50/70
                            "
                          >

                            {/* INVENTORY */}

                            <td
                              className="
                                px-5
                                py-4
                                font-semibold
                                text-slate-800
                              "
                            >
                              {prediction.inventory_id}
                            </td>


                            {/* DEMAND */}

                            <td
                              className="
                                px-5
                                py-4
                                text-slate-600
                              "
                            >
                              {prediction.forecast_daily_demand.toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </td>


                            {/* RISK SCORE */}

                            <td
                              className="
                                px-5
                                py-4
                                font-semibold
                                text-slate-700
                              "
                            >
                              {prediction.risk_score.toFixed(2)}
                            </td>


                            {/* RISK LEVEL */}

                            <td className="px-5 py-4">

                              <span
                                className={`
                                  rounded-full
                                  px-2.5
                                  py-1
                                  text-[11px]
                                  font-bold
                                  ${riskClasses}
                                `}
                              >
                                {prediction.risk_level}
                              </span>

                            </td>


                            {/* RECOMMENDED PURCHASE */}

                            <td
                              className="
                                px-5
                                py-4
                                font-semibold
                                text-slate-700
                              "
                            >
                              {prediction.recommended_purchase_quantity.toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </td>

                          </tr>

                        );
                      })}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>


        {/* ===================================================
            RECENT TRANSACTIONS
        =================================================== */}

        <div
          className="
            rounded-xl
            border
            border-slate-200/80
            bg-white
            shadow-sm
            lg:col-span-2
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-slate-100
              p-5
            "
          >

            <div>

              <h2
                className="
                  text-base
                  font-semibold
                  text-slate-900
                "
              >
                Recent Transactions
              </h2>

              <p
                className="
                  text-xs
                  text-slate-500
                "
              >
                Latest stock activity log
              </p>

            </div>


            <Link
              to="/transactions"
              className="
                text-xs
                font-semibold
                text-emerald-600
                hover:text-emerald-700
                hover:underline
              "
            >
              View all
            </Link>

          </div>


          {transactions.length === 0 ? (

            <div
              className="
                p-8
                text-center
                text-sm
                text-slate-500
              "
            >
              No transactions recorded yet.
            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {transactions
                .slice(0, 5)
                .map((t) => (

                  <div
                    key={t.id}
                    className="
                      flex
                      items-center
                      justify-between
                      p-4
                      hover:bg-slate-50/50
                    "
                  >

                    <div
                      className="
                        min-w-0
                        flex-1
                        pr-4
                      "
                    >

                      <p
                        className="
                          text-sm
                          font-medium
                          capitalize
                          text-slate-800
                        "
                      >
                        {t.transaction_type}
                      </p>

                      <p
                        className="
                          truncate
                          text-xs
                          text-slate-500
                        "
                      >
                        {t.note ||
                          "Standard Inventory Log"}
                      </p>

                    </div>


                    <div className="text-right">

                      <span
                        className="
                          inline-block
                          rounded-md
                          bg-slate-100
                          px-2.5
                          py-1
                          text-xs
                          font-semibold
                          text-slate-700
                        "
                      >
                        {t.quantity} units
                      </span>

                      <p
                        className="
                          mt-1
                          text-[11px]
                          text-slate-400
                        "
                      >
                        {new Date(
                          t.created_at
                        ).toLocaleDateString()}
                      </p>

                    </div>

                  </div>

                ))}

            </div>

          )}

        </div>


        {/* ===================================================
            EXPIRY ATTENTION
        =================================================== */}

        <div
          className="
            rounded-xl
            border
            border-slate-200/80
            bg-white
            shadow-sm
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-slate-100
              p-5
            "
          >

            <div>

              <h2
                className="
                  text-base
                  font-semibold
                  text-slate-900
                "
              >
                Expiry Attention
              </h2>

              <p
                className="
                  text-xs
                  text-slate-500
                "
              >
                Items requiring resolution
              </p>

            </div>


            <Link
              to="/expiry-alerts"
              className="
                text-xs
                font-semibold
                text-emerald-600
                hover:text-emerald-700
                hover:underline
              "
            >
              View alerts
            </Link>

          </div>


          <div className="space-y-3 p-4">


            {/* =================================================
                EXPIRED ITEMS
            ================================================= */}

            {expiredItems
              .slice(0, 3)
              .map((item) => (

                <div
                  key={item.id}
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-lg
                    border
                    border-rose-200
                    bg-rose-50/50
                    p-3.5
                  "
                >

                  <div className="min-w-0">

                    <p
                      className="
                        truncate
                        text-sm
                        font-semibold
                        text-rose-900
                      "
                    >
                      {item.name}
                    </p>

                    <p
                      className="
                        font-mono
                        text-xs
                        text-rose-600
                      "
                    >
                      SKU: {item.sku}
                    </p>

                  </div>


                  <span
                    className="
                      shrink-0
                      rounded-full
                      bg-rose-100
                      px-2.5
                      py-0.5
                      text-[11px]
                      font-bold
                      text-rose-800
                    "
                  >
                    Expired
                  </span>

                </div>

              ))}


            {/* =================================================
                EXPIRING SOON ITEMS
            ================================================= */}

            {expiringSoonItems
              .slice(0, 2)
              .map((item) => (

                <div
                  key={item.id}
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-lg
                    border
                    border-amber-200
                    bg-amber-50/50
                    p-3.5
                  "
                >

                  <div className="min-w-0">

                    <p
                      className="
                        truncate
                        text-sm
                        font-semibold
                        text-amber-900
                      "
                    >
                      {item.name}
                    </p>

                    <p
                      className="
                        font-mono
                        text-xs
                        text-amber-600
                      "
                    >
                      SKU: {item.sku}
                    </p>

                  </div>


                  <span
                    className="
                      shrink-0
                      rounded-full
                      bg-amber-100
                      px-2.5
                      py-0.5
                      text-[11px]
                      font-bold
                      text-amber-800
                    "
                  >
                    Expiring Soon
                  </span>

                </div>

              ))}


            {/* =================================================
                EMPTY EXPIRY STATE
            ================================================= */}

            {expiredItems.length === 0 &&
              expiringSoonItems.length === 0 && (

                <div
                  className="
                    rounded-lg
                    border
                    border-emerald-200
                    bg-emerald-50/40
                    p-6
                    text-center
                  "
                >

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-emerald-900
                    "
                  >
                    All Stock is Fresh
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-emerald-700
                    "
                  >
                    No expiring items need attention
                    right now.
                  </p>

                </div>

              )}

          </div>

        </div>

      </div>

    </div>
  );
}


export default Dashboard;