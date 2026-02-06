/**
 * Sidebar Component
 * Displays the list of QA stages and allows navigation between them
 */

import { useState, useEffect } from 'react';
import { useStage } from '../hooks/useStage';
import { STAGE_GROUPS, getGroupForStage } from '../types/stage';
import type { StageId, GroupId, StageGroup } from '../types/stage';
import { FiChevronDown, FiGithub, FiExternalLink } from 'react-icons/fi';

interface AccordionGroupProps {
  group: StageGroup;
  isExpanded: boolean;
  onToggle: () => void;
  currentStage: StageId;
  onStageClick: (stageId: StageId) => void;
}

function AccordionGroup({ group, isExpanded, onToggle, currentStage, onStageClick }: AccordionGroupProps) {
  return (
    <div className="border-2 border-border rounded-lg overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between bg-light hover:bg-gray-200 transition-colors duration-150"
      >
        <span className="text-sm font-bold text-muted uppercase tracking-wider">
          {group.title}
        </span>
        <FiChevronDown
          className={`text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          size={18}
        />
      </button>

      {/* Accordion Content - using CSS Grid for smooth animation */}
      <div
        className={`grid transition-all duration-200 ease-out ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-2 flex flex-col gap-2">
            {group.stages.map(stage => {
              const isActive = currentStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => onStageClick(stage.id)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer text-left transition-all duration-200
                    ${isActive
                      ? 'bg-primary text-white border-primary-dark font-bold'
                      : 'bg-white text-dark border-border hover:bg-gray-100 hover:border-gray-400'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-xl">{stage.icon}</span>
                    <span className="text-base">{stage.title}</span>
                  </div>
                  <div className={`text-xs ml-7.5 ${isActive ? 'opacity-90' : 'opacity-70'}`}>
                    {stage.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { currentStage, setCurrentStage } = useStage();
  const [expandedGroups, setExpandedGroups] = useState<Set<GroupId>>(new Set(['main-qa']));

  // Auto-expand the group containing the current stage
  useEffect(() => {
    const groupId = getGroupForStage(currentStage);
    if (groupId && !expandedGroups.has(groupId)) {
      setExpandedGroups(prev => new Set([...prev, groupId]));
    }
  }, [currentStage, expandedGroups]);

  const handleGroupToggle = (groupId: GroupId) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleStageClick = (stageId: StageId) => {
    setCurrentStage(stageId);
  };

  return (
    // Adjust sticky to account for fixed header (top-14) and constrain height
    // h-[calc(100vh-3.5rem)] ensures sidebar fills viewport height minus header (3.5rem = 56px)
    // This constrains the sidebar, making the inner overflow-y-auto div scroll independently
    <div className="bg-light border-r-2 border-border sticky top-14 flex flex-col basis-80 h-[calc(100vh-3.5rem)]">
      <div className="p-5 flex-shrink-0">
        <h2 className="m-0 text-xl text-dark">QA Stages</h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5">
        <div className="flex flex-col gap-3">
          {STAGE_GROUPS.map(group => (
            <AccordionGroup
              key={group.id}
              group={group}
              isExpanded={expandedGroups.has(group.id)}
              onToggle={() => handleGroupToggle(group.id)}
              currentStage={currentStage}
              onStageClick={handleStageClick}
            />
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 border-t-2 border-border px-5 py-3 flex items-center gap-4">
        <a
          href="https://github.com/tuliomir/hathor-qa-helper"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-dark transition-colors duration-150"
          title="Open in GitHub"
        >
          <FiGithub size={18} />
        </a>
        <a
          href="https://hathor-qa-helper.pages.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-dark transition-colors duration-150"
          title="Open publicly deployed"
        >
          <FiExternalLink size={18} />
        </a>
      </div>
    </div>
  );
}
