import React, { useState, useEffect } from 'react';
import { IoClose, IoPersonOutline, IoCashOutline, IoBusiness } from 'react-icons/io5';
import investmentService from '../../services/investment.service';
import { userService } from '../../services/user.service';
import { User } from '../../types/user.types';
import { Project, ProjectStatus } from '../../types/investment.types';

interface AssignInvestorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chatId?: string;
  preSelectedInvestorId?: string;
  preSelectedProjectId?: string;
}



export const AssignInvestorModal: React.FC<AssignInvestorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  chatId,
  preSelectedInvestorId,
  preSelectedProjectId,
}) => {
  const [investors, setInvestors] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedInvestorId, setSelectedInvestorId] = useState(preSelectedInvestorId || '');
  const [selectedProjectId, setSelectedProjectId] = useState(preSelectedProjectId || '');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [investorsData, projectsData] = await Promise.all([
        userService.getInvestors(),
        investmentService.getAllProjectsForAdmin(),
      ]);
      setInvestors(investorsData);
      setProjects(projectsData.filter((p: Project) => p.status === ProjectStatus.ONGOING));
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestorId || !selectedProjectId || !amount) {
      setError('Semua field harus diisi');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await investmentService.assignInvestorToProject({
        investorId: selectedInvestorId,
        projectId: selectedProjectId,
        amount: parseFloat(amount),
        chatId,
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error assigning investor:', error);
      setError(error.response?.data?.message || 'Gagal assign investor ke project');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedInvestorId(preSelectedInvestorId || '');
    setSelectedProjectId(preSelectedProjectId || '');
    setAmount('');
    setError('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Assign Investor ke Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Investor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <IoPersonOutline className="w-4 h-4 inline mr-1" />
              Pilih Investor
            </label>
            <select
              value={selectedInvestorId}
              onChange={(e) => setSelectedInvestorId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={!!preSelectedInvestorId}
            >
              <option value="">Pilih Investor...</option>
              {investors.map((investor) => (
                <option key={investor.id} value={investor.id}>
                  {investor.email}
                </option>
              ))}
            </select>
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <IoBusiness className="w-4 h-4 inline mr-1" />
              Pilih Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={!!preSelectedProjectId}
            >
              <option value="">Pilih Project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} - Target: {formatCurrency(project.targetAmount || 0)}
                </option>
              ))}
            </select>
          </div>

          {/* Investment Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <IoCashOutline className="w-4 h-4 inline mr-1" />
              Jumlah Investasi
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Masukkan jumlah investasi"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min="1"
              step="1000"
            />
          </div>

          {/* Selected Project Info */}
          {selectedProjectId && (
            <div className="bg-gray-50 p-3 rounded-lg">
              {(() => {
                const selectedProject = projects.find(p => p.id === selectedProjectId);
                if (!selectedProject) return null;
                return (
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedProject.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{selectedProject.description}</p>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Target: </span>
                      <span className="font-medium">{formatCurrency(selectedProject.targetAmount || 0)}</span>
                      <br />
                      <span className="text-gray-600">Terkumpul: </span>
                      <span className="font-medium">{formatCurrency(selectedProject.totalInvestment || 0)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Memproses...' : 'Assign Investor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};