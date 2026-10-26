"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  ArrowLeft,
  Info,
  Clock,
  Sparkles,
  History,
  Search,
  Sliders,
  Calendar,
  Layers,
  Database,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import {
  WatchTimePeriod,
  DEMO_WATCH_TIME_PERIODS,
  DEMO_MONTHLY_WATCH_TIME,
  DEMO_INTERESTS,
  DEMO_WATCH_ACTIVITY,
  DEMO_SEARCH_TRENDS,
  DEMO_WHY_THIS_VIDEO_ITEMS,
  DEMO_RECOMMENDATION_TOPICS,
} from "@/data/insights-demo-data";

import { WatchTimeDashboard } from "@/components/insights/WatchTimeDashboard";
import { MonthlyWatchTimeCard } from "@/components/insights/MonthlyWatchTimeCard";
import { InterestScoresSection } from "@/components/insights/InterestScoresSection";
import { WatchActivitySection } from "@/components/insights/WatchActivitySection";
import { SearchTrendsSection } from "@/components/insights/SearchTrendsSection";
import { WhyThisVideoSection } from "@/components/insights/WhyThisVideoSection";
import { ManageRecommendationsSection } from "@/components/insights/ManageRecommendationsSection";

export default function InsightsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<WatchTimePeriod>("last7days");
  const [isEmptyPreview, setIsEmptyPreview] = useState<boolean>(false);
  const [realInsights, setRealInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/user/insights")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated) {
          setRealInsights(data);
          if (data.isColdStart) {
            setIsEmptyPreview(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const isLive = Boolean(realInsights && realInsights.authenticated && !realInsights.isColdStart);
  const periods = realInsights?.watchTimePeriods || DEMO_WATCH_TIME_PERIODS;
  const monthly = realInsights?.monthlyWatchTime || DEMO_MONTHLY_WATCH_TIME;
  const interests = realInsights?.interests?.length > 0 ? realInsights.interests : DEMO_INTERESTS;
  const activity = realInsights?.watchActivity?.length > 0 ? realInsights.watchActivity : DEMO_WATCH_ACTIVITY;
  const trends = realInsights?.searchTrends?.length > 0 ? realInsights.searchTrends : DEMO_SEARCH_TRENDS;
  const whyItems = realInsights?.whyThisVideoItems?.length > 0 ? realInsights.whyThisVideoItems : DEMO_WHY_THIS_VIDEO_ITEMS;

  return (
    <div className="container insights-page-container">
      {/* Top Navigation Row */}
      <div className="insights-header-nav">
        <Link
          href="/dashboard"
          className="btn btn-outline btn-sm back-link"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div className="insights-header-title-row">
          <div>
            <h1 className="insights-main-title">
              <BarChart3 size={28} className="title-icon" />
              <span>Your Insights</span>
            </h1>
            <p className="insights-main-subtitle">
              {isLive
                ? "Live overview of your actual watch time, category affinities, and transparent recommendation signals."
                : "Simulated overview of watch time, interest affinities, viewing activity, and explainable recommendations."}
            </p>
          </div>
        </div>
      </div>

      {/* Status Notice Banner */}
      {isLive ? (
        <div className="global-live-banner">
          <div className="demo-banner-top">
            <div className="demo-badge-row">
              <span className="live-pill-badge">REAL ACTIVITY DATA</span>
              <span className="demo-scope-text">Personalized Viewing Intelligence</span>
            </div>
          </div>
          <p className="demo-banner-desc">
            Viewing metrics, category affinities, and recommendations are generated from your actual viewing and search behavior. Raw activity records are securely purged after 30 days while your learned recommendation profile retains persistent affinities.
          </p>

          {/* Section Quick Links */}
          <div className="quick-links-strip">
            <span className="quick-links-label">Quick Jump:</span>
            <a href="#section-watch-time" className="quick-link">Watch Time</a>
            <span className="quick-sep">•</span>
            <a href="#section-monthly" className="quick-link">Monthly</a>
            <span className="quick-sep">•</span>
            <a href="#section-interests" className="quick-link">Interests</a>
            <span className="quick-sep">•</span>
            <a href="#section-activity" className="quick-link">Activity</a>
            <span className="quick-sep">•</span>
            <a href="#section-search" className="quick-link">Search Trends</a>
            <span className="quick-sep">•</span>
            <a href="#section-why" className="quick-link">Why This Video?</a>
            <span className="quick-sep">•</span>
            <a href="#section-manage" className="quick-link">Manage</a>
          </div>
        </div>
      ) : (
        <div className="global-demo-banner">
          <div className="demo-banner-top">
            <div className="demo-badge-row">
              <span className="demo-pill-badge">
                {realInsights?.isColdStart ? "COLD START PREVIEW" : "DEMO DATA ONLY"}
              </span>
              <span className="demo-scope-text">
                {realInsights?.isColdStart ? "No Viewing History Recorded Yet" : "Simulated Intelligence Preview"}
              </span>
            </div>
          </div>
          <p className="demo-banner-desc">
            {realInsights?.isColdStart
              ? "You haven't watched any videos or saved searches yet. Below is a sample preview of how your viewing analytics and explainable recommendations will appear once you begin exploring content."
              : "This section demonstrates the analytics and explainability architecture for Tubify using modular sample data. Log in and watch videos to activate real personalized intelligence."}
          </p>

          {/* Section Quick Links */}
          <div className="quick-links-strip">
            <span className="quick-links-label">Quick Jump:</span>
            <a href="#section-watch-time" className="quick-link">Watch Time</a>
            <span className="quick-sep">•</span>
            <a href="#section-monthly" className="quick-link">Monthly</a>
            <span className="quick-sep">•</span>
            <a href="#section-interests" className="quick-link">Interests</a>
            <span className="quick-sep">•</span>
            <a href="#section-activity" className="quick-link">Activity</a>
            <span className="quick-sep">•</span>
            <a href="#section-search" className="quick-link">Search Trends</a>
            <span className="quick-sep">•</span>
            <a href="#section-why" className="quick-link">Why This Video?</a>
            <span className="quick-sep">•</span>
            <a href="#section-manage" className="quick-link">Manage</a>
          </div>
        </div>
      )}

      {/* SECTION A: Watch Time Dashboard */}
      <section id="section-watch-time" aria-labelledby="heading-watch-time">
        <WatchTimeDashboard
          periods={periods}
          selectedPeriod={selectedPeriod}
          onPeriodChange={(period) => setSelectedPeriod(period)}
          isEmptyPreview={isEmptyPreview}
          onToggleEmptyPreview={() => setIsEmptyPreview((prev) => !prev)}
        />
      </section>

      {/* SECTION B: Monthly Watch Time */}
      <section id="section-monthly" aria-labelledby="heading-monthly">
        <MonthlyWatchTimeCard summary={monthly} />
      </section>

      {/* SECTION C: Your Interests */}
      <section id="section-interests" aria-labelledby="heading-interests">
        <InterestScoresSection interests={interests} />
      </section>

      {/* SECTION D: Your Watch Activity */}
      <section id="section-activity" aria-labelledby="heading-activity">
        <WatchActivitySection activity={activity} />
      </section>

      {/* SECTION E: Your Search Trends */}
      <section id="section-search" aria-labelledby="heading-search">
        <SearchTrendsSection trends={trends} />
      </section>

      {/* SECTION F: Why This Video? */}
      <section id="section-why" aria-labelledby="heading-why">
        <WhyThisVideoSection items={whyItems} />
      </section>

      {/* SECTION G: Manage Recommendations */}
      <section id="section-manage" aria-labelledby="heading-manage">
        <ManageRecommendationsSection initialTopics={DEMO_RECOMMENDATION_TOPICS} />
      </section>

      {/* Future Backend Integration Architecture Note */}
      <div className="backend-readiness-card">
        <div className="readiness-header">
          <Database size={18} className="db-icon" />
          <h3 className="readiness-title">Future Backend Integration Readiness</h3>
        </div>
        <p className="readiness-desc">
          The &ldquo;Your Insights&rdquo; UI is designed with clean modularity. Once authenticated backend endpoints are authorized, the mock data module will be replaced with real user-scoped data contracts:
        </p>

        <div className="readiness-grid">
          <div className="readiness-item">
            <ShieldCheck size={16} className="item-icon" />
            <div>
              <strong>30-Day Activity Retention Policy</strong>
              <p>Strictly aggregates raw watch and search activity within the 30-day retention window.</p>
            </div>
          </div>

          <div className="readiness-item">
            <ShieldCheck size={16} className="item-icon" />
            <div>
              <strong>User Data Isolation</strong>
              <p>All queries run within PostgreSQL Row Level Security (RLS) scoped to the authenticated session user.</p>
            </div>
          </div>

          <div className="readiness-item">
            <ShieldCheck size={16} className="item-icon" />
            <div>
              <strong>Explainable AI Signals</strong>
              <p>Recommendation explanations link directly to embedding distances and category concentration scores.</p>
            </div>
          </div>

          <div className="readiness-item">
            <ShieldCheck size={16} className="item-icon" />
            <div>
              <strong>Calendar &amp; Timezone Boundaries</strong>
              <p>Calculates monthly summaries according to the user&apos;s preferred country and timezone settings.</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .insights-page-container {
          padding: 2.5rem 1.25rem 5rem;
          max-width: 1100px;
        }

        .insights-header-nav {
          margin-bottom: 2rem;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          margin-bottom: 1.25rem;
        }

        .insights-header-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .insights-main-title {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.025em;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .title-icon {
          color: var(--primary);
        }

        .insights-main-subtitle {
          color: var(--text-muted);
          margin-top: 0.5rem;
          font-size: 1rem;
          line-height: 1.5;
          max-width: 720px;
        }

        /* Demo Notice Banner */
        .global-demo-banner {
          background-color: var(--bg-surface);
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-left: 4px solid var(--primary);
          border-radius: var(--radius-lg);
          padding: 1.25rem 1.5rem;
          margin-bottom: 2.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .demo-banner-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .demo-badge-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .demo-pill-badge {
          background: linear-gradient(135deg, var(--primary), #2563eb);
          color: #ffffff;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 0.2rem 0.625rem;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }

        .global-live-banner {
          background-color: var(--bg-surface);
          border: 1px solid rgba(16, 185, 129, 0.35);
          border-left: 4px solid #10b981;
          border-radius: var(--radius-lg);
          padding: 1.25rem 1.5rem;
          margin-bottom: 2.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .live-pill-badge {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 0.2rem 0.625rem;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }

        .demo-scope-text {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--primary);
        }

        .demo-banner-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.55;
          margin: 0 0 1rem;
        }

        .demo-banner-desc strong {
          color: var(--text-main);
        }

        .quick-links-strip {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color);
        }

        .quick-links-label {
          color: var(--text-dim);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .quick-link {
          color: var(--primary);
          font-weight: 500;
          transition: color 0.15s ease;
        }

        .quick-link:hover {
          text-decoration: underline;
        }

        .quick-sep {
          color: var(--text-dim);
        }

        /* Backend Readiness Card */
        .backend-readiness-card {
          background-color: var(--bg-surface);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-top: 3rem;
        }

        .readiness-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .db-icon {
          color: #10b981;
        }

        .readiness-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .readiness-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0 0 1.25rem;
          max-width: 800px;
        }

        .readiness-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }

        .readiness-item {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          padding: 0.875rem;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
        }

        .readiness-item .item-icon {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .readiness-item strong {
          display: block;
          color: var(--text-main);
          font-weight: 600;
          margin-bottom: 0.2rem;
        }

        .readiness-item p {
          color: var(--text-muted);
          font-size: 0.75rem;
          line-height: 1.4;
          margin: 0;
        }

        @media (max-width: 640px) {
          .insights-main-title {
            font-size: 1.75rem;
          }
          .quick-links-strip {
            gap: 0.35rem;
          }
        }
      `}</style>
    </div>
  );
}
