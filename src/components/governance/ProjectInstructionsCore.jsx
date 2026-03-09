/**
 * PROJECT INSTRUCTIONS – FUEL STATION MASTERING SYSTEM
 * CORE PRINCIPLES (Original)
 * 
 * This document defines how AI agents and developers must interact with the project.
 * The project maintains a canonical catalog of fuel stations and merges price observations from multiple external sources.
 */

export const ProjectInstructionsCore = () => {
  return (
    <div className="prose max-w-4xl">
      <h1>Project Instructions – Fuel Station Mastering System</h1>

      <section>
        <h2>Source of Truth</h2>
        <p>The following files define the official rules for station classification and data quality:</p>
        <ul>
          <li>Station classification rules: docs/station_classification_rules.md</li>
          <li>Price plausibility rules: docs/classifyPricePlausibility.md</li>
          <li>Google Places confidence: docs/classifyGooglePlacesConfidence.md</li>
          <li>Rule engine: functions/classifyStationsRuleEngine.js</li>
        </ul>
        <p><strong>If code and documentation diverge, documentation is authoritative.</strong></p>
      </section>

      <section>
        <h2>Core Data Model</h2>
        <p>Primary entities:</p>
        <ul>
          <li>Station</li>
          <li>StationCandidate</li>
          <li>StationReview</li>
          <li>FuelPrice</li>
          <li>FetchLog</li>
        </ul>
        <p>Pipeline: Observation → StationCandidate → StationReview → Station</p>
        <p><strong>AI agents must never create Station records directly.</strong></p>
      </section>

      <section>
        <h2>Review System</h2>
        <p>Review queues protect data integrity.</p>
        <p>Current review types:</p>
        <ul>
          <li>chain_unconfirmed</li>
          <li>generic_name_review</li>
          <li>specialty_fuel_review</li>
          <li>non_fuel_poi_review</li>
          <li>local_fuel_site_review</li>
          <li>retail_fuel_operator_review</li>
        </ul>
        <p><strong>Automatic resolution only when rule certainty is high.</strong></p>
      </section>

      <section>
        <h2>Safety Principles</h2>
        <p><strong>Always prefer:</strong></p>
        <ul>
          <li>Conservative classification</li>
          <li>Traceability of decisions</li>
          <li>Manual review when uncertain</li>
        </ul>
        <p><strong>Avoid:</strong></p>
        <ul>
          <li>Aggressive auto-matching</li>
          <li>Silent reclassification</li>
          <li>Creation of stations without review pipeline</li>
        </ul>
      </section>

      <section>
        <h2>Admin Surface</h2>
        <p>Admin actions must follow: <strong>preview → apply</strong></p>
        <p>No destructive operation executes without preview.</p>
      </section>

      <section>
        <h2>AI Behavior Rules</h2>
        <ol>
          <li>Ask before modifying classification rules</li>
          <li>Keep documentation and code synchronized</li>
          <li>Avoid introducing new station creation logic</li>
          <li>Maintain review pipeline integrity</li>
          <li>Prefer rule-based classification over heuristic guesses</li>
        </ol>
      </section>
    </div>
  );
};

export default ProjectInstructionsCore;