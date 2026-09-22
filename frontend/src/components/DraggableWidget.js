import React, { useState } from 'react';
import './DraggableWidget.css';

const DraggableWidget = ({
  id,
  zone,
  index,
  onDragStartWidget,
  onDropWidget,
  onDeleteWidget,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dropPosition, setDropPosition] = useState(null); // 'before' | 'after' | null

  const handleDragStart = (e) => {
    // Prevent drag if originating from interactive inputs, buttons, sliders, etc.
    if (
      e.target.closest(
        'button, input, textarea, select, a, [role="button"], .no-drag, .media-disc-visualizer, .media-btn, .protocol-activate-btn, .math-keypad-grid, .math-key, .math-expression-input, .hardware-refresh-btn, .chrono-btn, .notes-textarea'
      )
    ) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, zone, index }));
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStartWidget) {
      onDragStartWidget(id, zone, index);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDropPosition(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      setDropPosition('before');
    } else {
      setDropPosition('after');
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropPosition(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const targetIdx = dropPosition === 'after' ? index + 1 : index;
    setDropPosition(null);
    setIsDragging(false);

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        const source = JSON.parse(dataStr);
        if (onDropWidget) {
          onDropWidget(source, zone, targetIdx);
        }
      }
    } catch (err) {
      console.warn('Drop parsing error:', err);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDeleteWidget) {
      onDeleteWidget(id, zone);
    }
  };

  return (
    <div
      className={`draggable-widget-wrapper ${isDragging ? 'is-dragging' : ''} ${
        dropPosition === 'before' ? 'drop-target-before' : ''
      } ${dropPosition === 'after' ? 'drop-target-after' : ''}`}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Floating delete button — visible on hover only */}
      {onDeleteWidget && (
        <button
          type="button"
          className="draggable-widget-delete-btn"
          onClick={handleDelete}
          title={`Remove widget`}
          aria-label={`Remove widget`}
        >
          ✕
        </button>
      )}

      {/* Widget Interactive Body */}
      <div className="draggable-widget-body" draggable={false}>
        {children}
      </div>
    </div>
  );
};

export default DraggableWidget;
