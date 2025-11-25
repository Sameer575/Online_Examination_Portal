import { useEffect, useState } from 'react';
import { AlertCircle, BookOpenCheck, ListPlus, Users2, Trash2, Edit3, Eye, X, Plus, CheckCircle2, FileText, Download, Save, Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../lib/api';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import GlassCard from '../components/GlassCard';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ students: 0, exams: 0, attempts: 0 });
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [customFieldsRequired, setCustomFieldsRequired] = useState(false);
  const [examForms, setExamForms] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examDetails, setExamDetails] = useState(null);
  const [showExamDetails, setShowExamDetails] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [showCustomFieldForm, setShowCustomFieldForm] = useState(false);
  const [formQuestion, setFormQuestion] = useState({
    examId: '',
    questionNumber: '',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    correctOptions: [],
    isMultipleChoice: false,
    marks: 1,
  });
  const [formCustomField, setFormCustomField] = useState({
    fieldName: '',
    fieldLabel: '',
    fieldType: 'text',
    options: [],
    placeholder: '',
    isRequired: false,
    order: 0,
  });
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('exams'); // exams, questions, results, custom-fields

  const loadDashboard = async () => {
    try {
      const [statsRes, examsRes, resultsRes, fieldsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/exams'),
        api.get('/api/admin/results'),
        api.get('/api/admin/custom-fields'),
      ]);
      setStats(statsRes.data);
      setExams(examsRes.data);
      setResults(resultsRes.data);
      setCustomFields(fieldsRes.data);
      
      // Check if any field is required to determine requirement status
      const hasRequired = fieldsRes.data.some(f => f.isRequired && f.isEnabled);
      setCustomFieldsRequired(hasRequired);
    } catch (error) {
      setToast(error.response?.data?.message || 'Failed to load admin data');
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const addExamForm = () => {
    setExamForms([
      ...examForms,
      {
        id: Date.now(),
        examTitle: '',
        durationMinutes: 30,
        disclaimer: '',
        passPercentage: 50,
        scheduleStart: '',
        scheduleEnd: '',
      },
    ]);
  };

  const removeExamForm = (id) => {
    setExamForms(examForms.filter((form) => form.id !== id));
  };

  const updateExamForm = (id, field, value) => {
    setExamForms(
      examForms.map((form) => (form.id === id ? { ...form, [field]: value } : form))
    );
  };

  const handleCreateExams = async (e) => {
    e.preventDefault();
    try {
      await Promise.all(
        examForms.map((form) =>
          api.post('/api/admin/exams', {
            examTitle: form.examTitle,
            durationMinutes: form.durationMinutes,
            disclaimer: form.disclaimer,
            passPercentage: form.passPercentage,
            scheduleStart: form.scheduleStart || null,
            scheduleEnd: form.scheduleEnd || null,
          })
        )
      );
      setExamForms([]);
      setToast(`Successfully created ${examForms.length} exam(s)`);
      await loadDashboard();
    } catch (error) {
      setToast(error.response?.data?.message || 'Failed to create exams');
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam? This will delete all questions, attempts, and results.')) {
      return;
    }
    try {
      await api.delete(`/api/admin/exams/${examId}`);
      setToast('Exam deleted successfully');
      await loadDashboard();
    } catch (error) {
      setToast(error.response?.data?.message || 'Failed to delete exam');
    }
  };

  const handleUpdateExam = async (examId, updates) => {
    try {
      await api.put(`/api/admin/exams/${examId}`, updates);
      setToast('Exam updated successfully');
      setEditingExam(null);
      await loadDashboard();
      if (showExamDetails && selectedExam === examId) {
        loadExamDetails(examId);
      }
    } catch (error) {
      setToast(error.response?.data?.message || 'Failed to update exam');
    }
  };

  const handleEditExam = (exam) => {
    setEditingExam({
      _id: exam._id,
      examTitle: exam.examTitle,
      durationMinutes: exam.durationMinutes,
      disclaimer: exam.disclaimer || '',
      passPercentage: exam.passPercentage || 50,
      isActive: exam.isActive !== false,
      scheduleStart: exam.scheduleStart ? new Date(exam.scheduleStart).toISOString().slice(0, 16) : '',
      scheduleEnd: exam.scheduleEnd ? new Date(exam.scheduleEnd).toISOString().slice(0, 16) : '',
    });
  };

  const handleExportCSV = async (examId = null) => {
    try {
      const url = examId
        ? `/api/admin/results/export/${examId}`
        : '/api/admin/results/export';
      
      const response = await fetch(`${api.defaults.baseURL}${url}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('examToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = examId ? `exam-results-${examId}.csv` : 'all-results.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      setToast('CSV file downloaded successfully');
    } catch (error) {
      setToast('Failed to export CSV');
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      const questionData = {
        questionText: formQuestion.questionText,
        optionA: formQuestion.optionA,
        optionB: formQuestion.optionB,
        optionC: formQuestion.optionC,
        optionD: formQuestion.optionD,
        isMultipleChoice: formQuestion.isMultipleChoice,
        marks: parseFloat(formQuestion.marks) || 1,
      };

      if (formQuestion.questionNumber) {
        questionData.questionNumber = Number(formQuestion.questionNumber);
      }

      if (formQuestion.isMultipleChoice) {
        if (formQuestion.correctOptions.length === 0) {
          setToast('Please select at least one correct option for multiple choice question');
          return;
        }
        questionData.correctOptions = formQuestion.correctOptions;
      } else {
        questionData.correctOption = formQuestion.correctOption;
      }

      await api.post(`/api/admin/exams/${formQuestion.examId}/questions`, questionData);
      setFormQuestion({
        examId: formQuestion.examId,
        questionNumber: '',
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        correctOptions: [],
        isMultipleChoice: false,
        marks: 1,
      });
      setToast('Question added');
      await loadDashboard();
    } catch (error) {
      setToast(error.response?.data?.message || 'Failed to add question');
    }
  };

  const handleDeleteQuestion = async (examId, questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }
    try {
      await api.delete(`/api/admin/exams/${examId}/questions/${questionId}`);
      setToast('Question deleted successfully');
      if (showExamDetails) {
        loadExamDetails(selectedExam);
      } else {
        await loadDashboard();
      }
    } catch (error) {
      setToast(error.response?.data?.message || 'Failed to delete question');
    }
  };

  const loadExamDetails = async (examId) => {
    try {
      const { data } = await api.get(`/api/admin/exams/${examId}`);
      setExamDetails(data);
      setSelectedExam(examId);
      setShowExamDetails(true);
    } catch (error) {
      setToast(error.response?.data?.message || 'Failed to load exam details');
    }
  };

  const toggleCorrectOption = (option) => {
    if (formQuestion.correctOptions.includes(option)) {
      setFormQuestion({
        ...formQuestion,
        correctOptions: formQuestion.correctOptions.filter((o) => o !== option),
      });
    } else {
      setFormQuestion({
        ...formQuestion,
        correctOptions: [...formQuestion.correctOptions, option],
      });
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardHeader
          title="Admin Mission Control"
          subtitle="Create multiple exams, manage questions, set criteria, and monitor all results."
        />

        {toast && (
          <div className="glass-card flex items-center gap-3 border-amber-300/30 text-amber-100">
            <AlertCircle size={18} />
            {toast}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={Users2} label="Students" value={stats.students} />
          <StatCard icon={BookOpenCheck} label="Exams" value={stats.exams} accent="from-pink-500 to-rose-600" />
          <StatCard icon={ListPlus} label="Attempts" value={stats.attempts} accent="from-emerald-500 to-green-600" />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10">
          <button
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'exams' ? 'border-b-2 border-brand-400 text-brand-300' : 'text-white/60 hover:text-white'
            }`}
            onClick={() => setActiveTab('exams')}
          >
            Exams
          </button>
          <button
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'questions' ? 'border-b-2 border-brand-400 text-brand-300' : 'text-white/60 hover:text-white'
            }`}
            onClick={() => setActiveTab('questions')}
          >
            Questions
          </button>
          <button
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'results' ? 'border-b-2 border-brand-400 text-brand-300' : 'text-white/60 hover:text-white'
            }`}
            onClick={() => setActiveTab('results')}
          >
            Results
          </button>
          <button
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'custom-fields' ? 'border-b-2 border-brand-400 text-brand-300' : 'text-white/60 hover:text-white'
            }`}
            onClick={() => setActiveTab('custom-fields')}
          >
            Custom Fields
          </button>
        </div>

        {/* Exams Tab */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Create Multiple Exams</h3>
                <button
                  type="button"
                  onClick={addExamForm}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Exam Form
                </button>
              </div>
              <form onSubmit={handleCreateExams} className="space-y-4">
                {examForms.map((form, idx) => (
                  <div key={form.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-white/80">Exam {idx + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeExamForm(form.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm text-white/70">
                        Exam Title
                        <input
                          required
                          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none"
                          value={form.examTitle}
                          onChange={(e) => updateExamForm(form.id, 'examTitle', e.target.value)}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-white/70">
                        Duration (minutes)
                        <input
                          type="number"
                          min={5}
                          required
                          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none"
                          value={form.durationMinutes}
                          onChange={(e) => updateExamForm(form.id, 'durationMinutes', Number(e.target.value))}
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1 text-sm text-white/70">
                      Pass Percentage (Fail Criteria)
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none"
                        value={form.passPercentage}
                        onChange={(e) => updateExamForm(form.id, 'passPercentage', Number(e.target.value))}
                        placeholder="50"
                      />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm text-white/70">
                        Schedule Start (Date & Time)
                        <input
                          type="datetime-local"
                          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none"
                          value={form.scheduleStart || ''}
                          onChange={(e) => updateExamForm(form.id, 'scheduleStart', e.target.value)}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-white/70">
                        Schedule End (Date & Time)
                        <input
                          type="datetime-local"
                          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none"
                          value={form.scheduleEnd || ''}
                          onChange={(e) => updateExamForm(form.id, 'scheduleEnd', e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1 text-sm text-white/70">
                      Disclaimer
                      <textarea
                        rows={3}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none resize-none"
                        value={form.disclaimer}
                        onChange={(e) => updateExamForm(form.id, 'disclaimer', e.target.value)}
                        placeholder="Enter disclaimer or instructions for students..."
                      />
                    </label>
                  </div>
                ))}
                {examForms.length > 0 && (
                  <button type="submit" className="btn-primary w-full">
                    Create All Exams ({examForms.length})
                  </button>
                )}
              </form>
            </GlassCard>

            {/* Exam List */}
            <GlassCard>
              <h3 className="text-xl font-semibold mb-4">All Exams</h3>
              <div className="space-y-3">
                {exams.map((exam) => (
                  <div
                    key={exam._id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{exam.examTitle}</h4>
                        {!exam.isActive && (
                          <span className="text-xs px-2 py-1 bg-rose-500/20 text-rose-300 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/60">
                        <span>⏱ {exam.durationMinutes} min</span>
                        <span>❓ {exam.questionCount || 0} questions</span>
                        <span>👥 Reach: {exam.reach || 0}</span>
                        <span>✅ Completed: {exam.completed || 0}</span>
                        <span>📊 Pass: {exam.passPercentage || 50}%</span>
                        {exam.scheduleStart && (
                          <span>
                            📅 Starts: {new Date(exam.scheduleStart).toLocaleString()}
                          </span>
                        )}
                        {exam.scheduleEnd && (
                          <span>
                            ⏰ Ends: {new Date(exam.scheduleEnd).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadExamDetails(exam._id)}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEditExam(exam)}
                        className="p-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                        title="Edit Exam"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam._id)}
                        className="p-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {exams.length === 0 && (
                  <p className="text-center text-white/60 py-8">No exams created yet.</p>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <GlassCard className="space-y-4">
            <h3 className="text-xl font-semibold">Add Question</h3>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <label className="flex flex-col gap-2 text-sm text-white/70">
                Select Exam
                <select
                  required
                  value={formQuestion.examId}
                  onChange={(e) => setFormQuestion({ ...formQuestion, examId: e.target.value })}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                >
                  <option value="">Choose exam</option>
                  {exams.map((exam) => (
                    <option key={exam._id} value={exam._id} className="bg-slate-900">
                      {exam.examTitle} ({exam.questionCount} Qs)
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-white/70">
                Question Number (optional)
                <input
                  type="number"
                  min={1}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                  value={formQuestion.questionNumber}
                  onChange={(e) => setFormQuestion({ ...formQuestion, questionNumber: e.target.value })}
                  placeholder="Auto if left empty"
                />
              </label>

              {['questionText', 'optionA', 'optionB', 'optionC', 'optionD'].map((field) => (
                <label key={field} className="flex flex-col gap-2 text-sm text-white/70">
                  {field === 'questionText' ? 'Question' : `Option ${field.slice(-1).toUpperCase()}`}
                  <input
                    required
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                    value={formQuestion[field]}
                    onChange={(e) => setFormQuestion({ ...formQuestion, [field]: e.target.value })}
                  />
                </label>
              ))}

              <label className="flex items-center gap-3 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={formQuestion.isMultipleChoice}
                  onChange={(e) =>
                    setFormQuestion({
                      ...formQuestion,
                      isMultipleChoice: e.target.checked,
                      correctOptions: [],
                      correctOption: 'A',
                    })
                  }
                  className="w-5 h-5 rounded"
                />
                Multiple Selection Question
              </label>

              {formQuestion.isMultipleChoice ? (
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Select All Correct Options</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['A', 'B', 'C', 'D'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleCorrectOption(opt)}
                        className={`px-4 py-2 rounded-xl border transition-colors ${
                          formQuestion.correctOptions.includes(opt)
                            ? 'bg-brand-500/30 border-brand-400 text-brand-300'
                            : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {formQuestion.correctOptions.length > 0 && (
                    <p className="text-xs text-white/50">
                      Selected: {formQuestion.correctOptions.join(', ')}
                    </p>
                  )}
                </div>
              ) : (
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Correct Option
                  <select
                    value={formQuestion.correctOption}
                    onChange={(e) =>
                      setFormQuestion({ ...formQuestion, correctOption: e.target.value })
                    }
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                  >
                    {['A', 'B', 'C', 'D'].map((opt) => (
                      <option key={opt} value={opt} className="bg-slate-900">
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="flex flex-col gap-2 text-sm text-white/70">
                Marks for this Question
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                  value={formQuestion.marks}
                  onChange={(e) =>
                    setFormQuestion({ ...formQuestion, marks: parseFloat(e.target.value) || 1 })
                  }
                  placeholder="e.g., 1, 2, 2.5"
                />
                <p className="text-xs text-white/50">Minimum 0.5 marks</p>
              </label>

              <button type="submit" className="btn-primary w-full">
                Save Question
              </button>
            </form>
          </GlassCard>
        )}

        {/* Custom Fields Tab */}
        {activeTab === 'custom-fields' && (
          <div className="space-y-6">
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Custom Student Fields</h3>
                  <p className="text-sm text-white/60 mt-1">
                    Create additional input fields that students must fill during signup
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingField(null);
                    setShowCustomFieldForm(true);
                    setFormCustomField({
                      fieldName: '',
                      fieldLabel: '',
                      fieldType: 'text',
                      options: [],
                      placeholder: '',
                      isRequired: false,
                      order: customFields.length,
                    });
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Field
                </button>
              </div>

              {/* Toggle Requirement Button */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
                <div>
                  <h4 className="font-semibold">Require Custom Fields</h4>
                  <p className="text-sm text-white/60">
                    When enabled, students must fill all enabled custom fields during signup
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.post('/api/admin/custom-fields/toggle-requirement', {
                        enabled: !customFieldsRequired,
                      });
                      setCustomFieldsRequired(!customFieldsRequired);
                      setToast(
                        !customFieldsRequired
                          ? 'Custom fields are now mandatory for signup'
                          : 'Custom fields are now optional'
                      );
                      await loadDashboard();
                    } catch (error) {
                      setToast(error.response?.data?.message || 'Failed to toggle requirement');
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    customFieldsRequired
                      ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                      : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                  }`}
                >
                  {customFieldsRequired ? (
                    <>
                      <ToggleRight size={20} />
                      Enabled
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={20} />
                      Disabled
                    </>
                  )}
                </button>
              </div>

              {/* Custom Fields List */}
              <div className="space-y-3">
                {customFields.map((field) => (
                  <div
                    key={field._id}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{field.fieldLabel}</h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                          {field.fieldType}
                        </span>
                        {field.isRequired && (
                          <span className="text-xs px-2 py-1 rounded-full bg-rose-500/20 text-rose-300">
                            Required
                          </span>
                        )}
                        {field.isEnabled ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">
                            Enabled
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-500/20 text-slate-300">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/60 mt-1">
                        Field Name: <code className="text-xs">{field.fieldName}</code>
                        {field.placeholder && ` • Placeholder: ${field.placeholder}`}
                      </p>
                      {field.fieldType === 'select' && field.options.length > 0 && (
                        <p className="text-xs text-white/50 mt-1">
                          Options: {field.options.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingField(field);
                          setShowCustomFieldForm(true);
                          setFormCustomField({
                            fieldName: field.fieldName,
                            fieldLabel: field.fieldLabel,
                            fieldType: field.fieldType,
                            options: field.options || [],
                            placeholder: field.placeholder || '',
                            isRequired: field.isRequired,
                            order: field.order,
                          });
                        }}
                        className="p-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Delete this custom field?')) return;
                          try {
                            await api.delete(`/api/admin/custom-fields/${field._id}`);
                            setToast('Custom field deleted');
                            await loadDashboard();
                          } catch (error) {
                            setToast(error.response?.data?.message || 'Failed to delete field');
                          }
                        }}
                        className="p-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {customFields.length === 0 && (
                  <p className="text-center text-white/60 py-8">No custom fields created yet.</p>
                )}
              </div>
            </GlassCard>

            {/* Add/Edit Field Modal */}
            {showCustomFieldForm && (
              <GlassCard className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">
                    {editingField ? 'Edit Custom Field' : 'Create Custom Field'}
                  </h3>
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setShowCustomFieldForm(false);
                      setFormCustomField({
                        fieldName: '',
                        fieldLabel: '',
                        fieldType: 'text',
                        options: [],
                        placeholder: '',
                        isRequired: false,
                        order: customFields.length,
                      });
                    }}
                    className="p-2 rounded-lg hover:bg-white/10"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      if (editingField) {
                        await api.put(`/api/admin/custom-fields/${editingField._id}`, formCustomField);
                        setToast('Custom field updated');
                      } else {
                        await api.post('/api/admin/custom-fields', formCustomField);
                        setToast('Custom field created');
                      }
                      setEditingField(null);
                      setShowCustomFieldForm(false);
                      setFormCustomField({
                        fieldName: '',
                        fieldLabel: '',
                        fieldType: 'text',
                        options: [],
                        placeholder: '',
                        isRequired: false,
                        order: customFields.length,
                      });
                      await loadDashboard();
                    } catch (error) {
                      setToast(error.response?.data?.message || 'Failed to save custom field');
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm text-white/70">
                      Field Name (unique identifier)
                      <input
                        required
                        disabled={!!editingField}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none disabled:opacity-50"
                        value={formCustomField.fieldName}
                        onChange={(e) =>
                          setFormCustomField({
                            ...formCustomField,
                            fieldName: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                          })
                        }
                        placeholder="e.g. student_id"
                      />
                      <p className="text-xs text-white/50">No spaces, lowercase with underscores</p>
                    </label>
                    <label className="flex flex-col gap-2 text-sm text-white/70">
                      Field Label (display name)
                      <input
                        required
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                        value={formCustomField.fieldLabel}
                        onChange={(e) =>
                          setFormCustomField({ ...formCustomField, fieldLabel: e.target.value })
                        }
                        placeholder="e.g. Student ID"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm text-white/70">
                      Field Type
                      <select
                        value={formCustomField.fieldType}
                        onChange={(e) =>
                          setFormCustomField({
                            ...formCustomField,
                            fieldType: e.target.value,
                            options: e.target.value === 'select' ? formCustomField.options : [],
                          })
                        }
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                      >
                        <option value="text" className="bg-slate-900">Text</option>
                        <option value="number" className="bg-slate-900">Number</option>
                        <option value="email" className="bg-slate-900">Email</option>
                        <option value="textarea" className="bg-slate-900">Textarea</option>
                        <option value="select" className="bg-slate-900">Select (Dropdown)</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm text-white/70">
                      Placeholder Text
                      <input
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                        value={formCustomField.placeholder}
                        onChange={(e) =>
                          setFormCustomField({ ...formCustomField, placeholder: e.target.value })
                        }
                        placeholder="e.g. Enter your student ID"
                      />
                    </label>
                  </div>

                  {formCustomField.fieldType === 'select' && (
                    <label className="flex flex-col gap-2 text-sm text-white/70">
                      Options (one per line)
                      <textarea
                        rows={4}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none resize-none"
                        value={formCustomField.options.join('\n')}
                        onChange={(e) =>
                          setFormCustomField({
                            ...formCustomField,
                            options: e.target.value.split('\n').filter((opt) => opt.trim()),
                          })
                        }
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                    </label>
                  )}

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-3 text-sm text-white/70">
                      <input
                        type="checkbox"
                        checked={formCustomField.isRequired}
                        onChange={(e) =>
                          setFormCustomField({ ...formCustomField, isRequired: e.target.checked })
                        }
                        className="w-5 h-5 rounded"
                      />
                      Required Field
                    </label>
                    <label className="flex items-center gap-3 text-sm text-white/70">
                      <input
                        type="number"
                        min={0}
                        className="w-20 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none"
                        value={formCustomField.order}
                        onChange={(e) =>
                          setFormCustomField({
                            ...formCustomField,
                            order: Number(e.target.value),
                          })
                        }
                      />
                      Display Order
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary flex-1">
                      {editingField ? 'Update Field' : 'Create Field'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField(null);
                        setShowCustomFieldForm(false);
                        setFormCustomField({
                          fieldName: '',
                          fieldLabel: '',
                          fieldType: 'text',
                          options: [],
                          placeholder: '',
                          isRequired: false,
                          order: customFields.length,
                        });
                      }}
                      className="btn-ghost flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </GlassCard>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">All Results</h3>
              <button
                onClick={() => handleExportCSV()}
                className="btn-primary flex items-center gap-2"
              >
                <Download size={18} />
                Export All to CSV
              </button>
            </div>
            <div className="overflow-auto rounded-2xl border border-white/5">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/10">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Exam</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Result</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result._id} className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/80">
                        {result.student?.name}
                        <p className="text-xs text-white/40">{result.student?.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-white/80">{result.exam?.examTitle}</td>
                      <td className="px-4 py-3 text-white">
                        {result.obtainedMarks ? (
                          <>
                            {result.obtainedMarks.toFixed(1)}/{result.totalMarks?.toFixed(1)} marks
                            <br />
                            <span className="text-xs text-white/60">
                              ({result.score}/{result.totalQuestions} Qs, {result.percentage}%)
                            </span>
                          </>
                        ) : (
                          <>
                            {result.score}/{result.totalQuestions} ({result.percentage}%)
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            result.passed
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {result.passed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {new Date(result.submittedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-white/60">
                        No attempts yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* Exam Details Modal */}
        {showExamDetails && examDetails && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <GlassCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold">{examDetails.exam.examTitle}</h3>
                <button
                  onClick={() => {
                    setShowExamDetails(false);
                    setExamDetails(null);
                  }}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <span className="text-white/60">Duration:</span>
                  <p className="font-semibold">{examDetails.exam.durationMinutes} minutes</p>
                </div>
                <div>
                  <span className="text-white/60">Pass %:</span>
                  <p className="font-semibold">{examDetails.exam.passPercentage || 50}%</p>
                </div>
                <div>
                  <span className="text-white/60">Reach:</span>
                  <p className="font-semibold">
                    {examDetails.stats.completed}/{examDetails.stats.reach}
                  </p>
                </div>
              </div>

              {examDetails.exam.disclaimer && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText size={18} />
                    Disclaimer
                  </h4>
                  <p className="text-sm text-white/80 whitespace-pre-line">
                    {examDetails.exam.disclaimer}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-3">Questions ({examDetails.stats.totalQuestions})</h4>
                <div className="space-y-3">
                  {examDetails.questions.map((q, idx) => (
                    <div
                      key={q._id}
                      className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {q.questionNumber ? `Q${q.questionNumber}` : `Q${idx + 1}`}
                          </span>
                          <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded-full">
                            {q.marks || 1} {q.marks === 1 ? 'mark' : 'marks'}
                          </span>
                          {q.isMultipleChoice && (
                            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                              Multiple
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(selectedExam, q._id)}
                          className="text-rose-400 hover:text-rose-300 text-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-white/90">{q.questionText}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {['A', 'B', 'C', 'D'].map((opt) => {
                          const isCorrect = q.isMultipleChoice
                            ? q.correctOptions?.includes(opt)
                            : q.correctOption === opt;
                          return (
                            <div
                              key={opt}
                              className={`p-2 rounded ${
                                isCorrect
                                  ? 'bg-green-500/20 border border-green-500/40'
                                  : 'bg-white/5 border border-white/10'
                              }`}
                            >
                              <span className="font-semibold">{opt}:</span> {q[`option${opt}`]}
                              {isCorrect && (
                                <CheckCircle2 size={14} className="inline ml-2 text-green-400" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Student Results ({examDetails.results.length})</h4>
                  <button
                    onClick={() => handleExportCSV(selectedExam)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors text-sm"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>
                <div className="overflow-auto rounded-xl border border-white/5">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Student</th>
                        <th className="px-4 py-2 font-semibold">Score</th>
                        <th className="px-4 py-2 font-semibold">Result</th>
                        <th className="px-4 py-2 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examDetails.results.map((result) => (
                        <tr key={result._id} className="border-b border-white/5">
                          <td className="px-4 py-2 text-white/80">
                            {result.student?.name}
                            <p className="text-xs text-white/40">{result.student?.phone}</p>
                          </td>
                          <td className="px-4 py-2 text-white">
                            {result.obtainedMarks ? (
                              <>
                                {result.obtainedMarks.toFixed(1)}/{result.totalMarks?.toFixed(1)} marks
                                <br />
                                <span className="text-xs text-white/60">
                                  ({result.score}/{result.totalQuestions} Qs, {result.percentage}%)
                                </span>
                              </>
                            ) : (
                              <>
                                {result.score}/{result.totalQuestions} ({result.percentage}%)
                              </>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                result.passed
                                  ? 'bg-green-500/20 text-green-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {result.passed ? 'Passed' : 'Failed'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-white/60">
                            {new Date(result.submittedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Edit Exam Modal */}
        {editingExam && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <GlassCard className="max-w-2xl w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold">Edit Exam</h3>
                <button
                  onClick={() => setEditingExam(null)}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <X size={24} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateExam(editingExam._id, {
                    examTitle: editingExam.examTitle,
                    durationMinutes: editingExam.durationMinutes,
                    disclaimer: editingExam.disclaimer,
                    passPercentage: editingExam.passPercentage,
                    isActive: editingExam.isActive,
                    scheduleStart: editingExam.scheduleStart || null,
                    scheduleEnd: editingExam.scheduleEnd || null,
                  });
                }}
                className="space-y-4"
              >
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Exam Title
                  <input
                    required
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                    value={editingExam.examTitle}
                    onChange={(e) =>
                      setEditingExam({ ...editingExam, examTitle: e.target.value })
                    }
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-white/70">
                    Duration (minutes)
                    <input
                      type="number"
                      min={5}
                      required
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                      value={editingExam.durationMinutes}
                      onChange={(e) =>
                        setEditingExam({
                          ...editingExam,
                          durationMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-white/70">
                    Pass Percentage
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                      value={editingExam.passPercentage}
                      onChange={(e) =>
                        setEditingExam({
                          ...editingExam,
                          passPercentage: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Disclaimer
                  <textarea
                    rows={4}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none resize-none"
                    value={editingExam.disclaimer}
                    onChange={(e) =>
                      setEditingExam({ ...editingExam, disclaimer: e.target.value })
                    }
                    placeholder="Enter disclaimer or instructions for students..."
                  />
                </label>

                <label className="flex items-center gap-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={editingExam.isActive}
                    onChange={(e) =>
                      setEditingExam({ ...editingExam, isActive: e.target.checked })
                    }
                    className="w-5 h-5 rounded"
                  />
                  Exam is Active (visible to students)
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-white/70">
                    Schedule Start (Date & Time)
                    <input
                      type="datetime-local"
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                      value={editingExam.scheduleStart || ''}
                      onChange={(e) =>
                        setEditingExam({ ...editingExam, scheduleStart: e.target.value })
                      }
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-white/70">
                    Schedule End (Date & Time)
                    <input
                      type="datetime-local"
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                      value={editingExam.scheduleEnd || ''}
                      onChange={(e) =>
                        setEditingExam({ ...editingExam, scheduleEnd: e.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Save size={18} />
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingExam(null)}
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
