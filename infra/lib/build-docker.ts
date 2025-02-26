import { execSync } from "child_process";
import { dockerHubImage } from '../config';
import path = require("path");

function isDockerLoggedIn(): boolean {
  try {
    const result = execSync('docker info').toString();
    return result.includes('Username:');
  } catch (error) {
    return false;
  }
}

export function buildDocker() {
    // Build and push Docker image
    if (!isDockerLoggedIn()) {
      console.error('Error: Not logged in to Docker Hub. Please run "docker login -u <username>" first.');
      throw new Error('Docker Hub authentication required');
    }
  
    try {
      console.log('Building Docker image...');
      execSync(`docker build -t ${dockerHubImage} -f ../Dockerfile.prod ..`, {
        stdio: 'inherit'
      });
      
      console.log('Pushing to Docker Hub...');
      execSync(`docker push ${dockerHubImage}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Error building or pushing Docker image:', error);
      throw error;
    }      
}