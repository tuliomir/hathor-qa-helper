/**
 * Type definitions for the Mobile QA Walkthrough system
 */

/**
 * Status of a QA step
 */
export type MobileQAStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

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
 * Complete Mobile QA configuration
 */
export interface MobileQAConfig {
  /** Version of the configuration */
  version: string;
  /** All sections in order */
  sections: SectionConfig[];
}

/**
 * Progress state for a single step
 */
export interface StepProgress {
  /** Current status of the step */
  status: MobileQAStepStatus;
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
export interface MobileQALocation {
  /** Current section ID */
  sectionId: string;
  /** Current step ID */
  stepId: string;
}

/**
 * Complete progress state for the Mobile QA walkthrough
 */
export interface MobileQAProgress {
  /** Progress for each section, keyed by section ID */
  sections: Record<string, SectionProgress>;
  /** Current location in the walkthrough */
  currentLocation: MobileQALocation;
}
