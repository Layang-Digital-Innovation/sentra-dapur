"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProjectList from '@/components/investment/ProjectList';
import ProjectForm from '@/components/investment/ProjectForm';
import ProjectDetailOwner from '@/components/investment/ProjectDetailOwner';
import InvestmentService from '@/services/investment.service';
import { Project, Investment, Report } from '@/types/investment.types';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    // Fetch investments and reports when a project is selected for detail view
    const fetchProjectDetails = async () => {
      if (selectedProject && currentView === 'detail') {
        try {
          const projectDetails = await InvestmentService.getProjectById(selectedProject.id);
          setInvestments(projectDetails.investments || []);
          setReports(projectDetails.reports || []);
        } catch (error) {
          console.error('Error fetching project details:', error);
        }
      }
    };

    fetchProjectDetails();
  }, [selectedProject, currentView]);

  if (!user || user.user.role !== 'PROJECT_OWNER') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            Only project owners can access this page.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateProject = () => {
    setSelectedProject(null);
    setCurrentView('create');
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('edit');
  };

  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('detail');
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setCurrentView('list');
  };

  const handleProjectSubmit = async (data: any) => {
    try {
      if (currentView === 'edit' && selectedProject?.id) {
        await InvestmentService.updateProject(selectedProject.id, data);
      } else {
        await InvestmentService.createProject(data);
      }
      setCurrentView('list');
      setSelectedProject(null);
      setRefreshTick((x)=>x+1);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Gagal menyimpan proyek');
    }
  };
  
  const handleUploadReport = (project: Project) => {
    setSelectedProject(project);
    // Implement report upload functionality
    console.log('Upload report for project:', project);
  };

  return (
    <div className="space-y-6">
      {currentView === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
              <p className="text-gray-600">Manage your investment projects</p>
            </div>
            <button
              onClick={handleCreateProject}
              className="bg-blue-600 text-white px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              Create New Project
            </button>
          </div>
          <ProjectList 
            onEditProject={handleEditProject}
            onViewProject={handleViewProject}
            refreshTrigger={refreshTick}
          />
        </>
      )}

      {(currentView === 'create' || currentView === 'edit') && (
        <>
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={handleBackToList}
              className="text-blue-600 hover:text-blue-800 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Projects</span>
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {currentView === 'create' ? 'Create New Project' : 'Edit Project'}
            </h1>
            <p className="text-gray-600 mb-6">
              {currentView === 'create' 
                ? 'Fill in the details to create a new investment project' 
                : 'Update your project information'
              }
            </p>
          </div>
          <ProjectForm 
              initialData={selectedProject || undefined}
              onSubmit={handleProjectSubmit}
              onCancel={handleBackToList}
              isEdit={currentView === 'edit'}
          />
        </>
      )}

      {currentView === 'detail' && selectedProject && (
        <>
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={handleBackToList}
              className="text-blue-600 hover:text-blue-800 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Projects</span>
            </button>
          </div>
          <ProjectDetailOwner
            project={selectedProject}
            investments={investments}
            reports={reports}
            onClose={handleBackToList}
            onEdit={handleEditProject}
            onUploadReport={handleUploadReport}
          />
        </>
      )}
    </div>
  );
}