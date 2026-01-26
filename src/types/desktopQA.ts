/**
 * Type definitions for the Desktop QA Walkthrough system
 * Mirrors the Mobile QA type system for consistency
 */

/**
 * Status of a QA step
 */
export type DesktopQAStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/**
 * Configuration for an embedded tool/stage component
 */
export interface ToolConfig {
  /** Component key that maps to the component registry */
  componentKey: string;
}

/**
 * Configuration for a single QA step
 */
export interface StepConfig {
  /** Unique identifier for the step within its section */
  id: string;
  /** Step title displayed in the sidebar */
  title: string;
  /** Detailed instructions for the step (can include markdown) */
  instructions: string;
  /** Optional embedded tool configuration */
  tool?: ToolConfig;
}

/**
 * Configuration for a QA section (group of related steps)
 */
export interface SectionConfig {
  /** Unique identifier for the section */
  id: string;
  /** Section title displayed in the sidebar */
  title: string;
  /** Brief description of the section */
  description: string;
  /** Steps within this section */
  steps: StepConfig[];
}

/**
 * Complete Desktop QA configuration
 */
export interface DesktopQAConfig {
  /** Version of the configuration */
  version: string;
  /** URL to the original QA document */
  sourceUrl: string;
  /** All sections in order */
  sections: SectionConfig[];
}

/**
 * Progress state for a single step
 */
export interface StepProgress {
  /** Current status of the step */
  status: DesktopQAStepStatus;
  /** Timestamp when the step was completed */
  completedAt?: number;
}

/**
 * Progress state for a section
 */
export interface SectionProgress {
  /** Progress for each step, keyed by step ID */
  steps: Record<string, StepProgress>;
}

/**
 * Current location in the walkthrough
 */
export interface DesktopQALocation {
  /** Current section ID */
  sectionId: string;
  /** Current step ID */
  stepId: string;
}

/**
 * Complete progress state for the Desktop QA walkthrough
 */
export interface DesktopQAProgress {
  /** Progress for each section, keyed by section ID */
  sections: Record<string, SectionProgress>;
  /** Current location in the walkthrough */
  currentLocation: DesktopQALocation;
}
