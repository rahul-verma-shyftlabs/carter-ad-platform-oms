import React from 'react';
import { Typography, carterColors, Tooltip } from 'shyftlabs-dsl';
import { Check, X } from 'lucide-react';
import styles from '../../styles/crm.module.scss';

interface LeadStatusProgressProps {
  status: string;
  type?: 'lead' | 'opportunity';
}

const LeadStatusProgress: React.FC<LeadStatusProgressProps> = ({ status, type = 'lead' }) => {
  // Define status stages for leads
  const leadStages = [
    { label: 'Open - Not Contacted', key: 'open' },
    { label: 'Working - Contacted', key: 'working' },
    { label: 'Closed - Not Converted', key: 'closed' },
    { label: 'Converted', key: 'converted' },
  ];

  // Define status stages for opportunities (Salesforce stages)
  const opportunityStages = [
    { label: 'Prospecting', key: 'prospecting' },
    { label: 'Qualification', key: 'qualification' },
    { label: 'Needs Analysis', key: 'needs_analysis' },
    { label: 'Value Proposition', key: 'value_proposition' },
    { label: 'Id. Decision Makers', key: 'decision_makers' },
    { label: 'Perception Analysis', key: 'perception_analysis' },
    { label: 'Proposal/Price Quote', key: 'proposal' },
    { label: 'Negotiation/Review', key: 'negotiation' },
    { label: 'Closed Won', key: 'closed_won' },
    { label: 'Closed Lost', key: 'closed_lost' },
  ];

  const stages = type === 'opportunity' ? opportunityStages : leadStages;

  // Normalize status to determine current stage
  const normalizeStatus = (status: string, stagesType: typeof stages): number => {
    const statusLower = status.toLowerCase().trim();
    
    if (type === 'opportunity') {
      // For opportunities, try to match the stage name
      const stageIndex = stagesType.findIndex(
        (stage) => statusLower.includes(stage.key.toLowerCase()) || 
                   stage.label.toLowerCase().includes(statusLower)
      );
      return stageIndex >= 0 ? stageIndex : 0;
    } else {
      // For leads - check in order of specificity
      // First try exact match with stage labels
      const exactMatchIndex = stagesType.findIndex(
        (stage) => stage.label.toLowerCase() === statusLower
      );
      if (exactMatchIndex >= 0) return exactMatchIndex;
      
      // Then check for "Closed - Not Converted" specifically
      if (statusLower.includes('closed') && statusLower.includes('not') && statusLower.includes('converted')) return 2;
      // Then check for "Converted" (must not have "not" before it)
      if (statusLower.includes('converted') && !statusLower.includes('not')) return 3;
      // Then check for "Closed" (without converted)
      if (statusLower.includes('closed') && !statusLower.includes('converted')) return 2;
      // Then check for working/contacted (but not "not contacted")
      if ((statusLower.includes('working') || statusLower.includes('contacted')) && !statusLower.includes('not contacted')) return 1;
      // Default to first stage (Open - Not Contacted)
      return 0;
    }
  };

  const currentStage = normalizeStatus(status, stages);
  const currentStageLabel = stages[currentStage]?.label || status;

  return (
    <div className={styles.lead_status_progress_wrapper} style={{ overflow: 'visible' }}>
      <div className={styles.progress_status_label}>
        <Typography variant="caption-semibold" color={carterColors['text-700']}>
          Current Status: <span style={{ color: carterColors['brand-600'], fontWeight: 600 }}>{currentStageLabel}</span>
        </Typography>
      </div>
      <div className={styles.lead_status_progress} style={{ overflow: 'visible' }}>
        {stages.map((stage, index) => {
          // If current stage is the last stage, all stages are completed
          const isLastStage = currentStage === stages.length - 1;
          const isCompleted = isLastStage ? true : index < currentStage;
          const isActive = isLastStage ? false : index === currentStage;
          const isFuture = isLastStage ? false : index > currentStage;
          // Check if current status is "Closed - Not Converted" (rejected state)
          const isRejected = currentStageLabel.toLowerCase().includes('closed - not converted') || 
                            currentStageLabel.toLowerCase().includes('closed not converted');
          const isRejectedStage = isRejected && index === currentStage;

          return (
            <Tooltip
              key={stage.key}
              title={stage.label}
              placement="bottom"
              arrow
            >
              <div
              className={`${styles.progress_segment} ${
                isCompleted ? styles.progress_segment_completed : ''
              } ${isActive && !isRejectedStage ? styles.progress_segment_active : ''} ${
                isRejectedStage ? styles.progress_segment_rejected : ''
              } ${isFuture ? styles.progress_segment_future : ''} ${
                index < stages.length - 1 ? styles.progress_segment_arrow : ''
              }`}
                style={{ position: 'relative', overflow: 'visible', zIndex: 1 }}
            >
                <div className={styles.progress_segment_content} style={{ overflow: 'visible', position: 'relative', zIndex: 2 }}>
                <div className={styles.progress_segment_indicator}>
                  {isCompleted ? (
                    <div className={styles.progress_checkmark}>
                      <Check size={14} color="white" strokeWidth={2.5} />
                    </div>
                  ) : isRejectedStage ? (
                    <div className={styles.progress_rejected_icon}>
                      <X size={14} color="white" strokeWidth={2.5} />
                    </div>
                  ) : isActive ? (
                    <div className={styles.progress_active_dot}></div>
                  ) : (
                    <div className={styles.progress_future_dot}></div>
                  )}
                </div>
                  </div>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default LeadStatusProgress;
