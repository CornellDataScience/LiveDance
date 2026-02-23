/**
 * LiveDance Component - MVC Architecture
 * Main component that connects the Controller and View
 */
import React from 'react';
import { usePoseDetectorController } from './controllers/PoseDetectorController';
import PoseDetectorView from './views/PoseDetectorView';

function LiveDance() {
  // Get all state and functions from the Controller
  const controllerProps = usePoseDetectorController();
  
  // Pass everything to the View
  return <PoseDetectorView {...controllerProps} />;
}

export default LiveDance;