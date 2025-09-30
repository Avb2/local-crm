// Sales CRM Dashboard Application
// SalesCRM v1.0.1 - Thomasnet Scraper Integration
class SalesCRM {
    constructor() {
        this.db = null;
        this.currentLeadId = null;
        this.config = {
            callQueueDays: 7,
            smtpServer: '',
            smtpPort: 587,
            smtpUser: '',
            smtpPass: ''
        };
        this.pagination = {
            currentPage: 1,
            pageSize: 25,
            totalItems: 0,
            totalPages: 0
        };
        this.callLogPagination = {
            currentPage: 1,
            pageSize: 25,
            totalItems: 0,
            totalPages: 0
        };
        this.prospectingPagination = {
            currentPage: 1,
            pageSize: 25,
            totalItems: 0,
            totalPages: 0
        };
        this.currentQueue = 'default';
        this.customQueues = [];
        this.columnResizing = {
            isResizing: false,
            startX: 0,
            startWidth: 0,
            currentColumn: null
        };
        this.init();
    }

    async init() {
        await this.initDatabase();
        await this.loadConfig();
        await this.loadCustomQueues(); // Load custom queues on startup
        this.setupEventListeners();
        this.initCallMode();
        this.initScriptManagement();
        this.initThomasnetScraper();
        this.updateDashboard();
        await this.updateAllViews();
    }

    // Database Management
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SalesCRM', 4);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully:', this.db.objectStoreNames);
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                // Leads store
                if (!db.objectStoreNames.contains('leads')) {
                    const leadsStore = db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
                    leadsStore.createIndex('company', 'company');
                    leadsStore.createIndex('state', 'state');
                    leadsStore.createIndex('industry', 'industry');
                    leadsStore.createIndex('lastCalled', 'lastCalled');
                    leadsStore.createIndex('callOutcome', 'callOutcome');
                } else if (oldVersion < 4) {
                    // Upgrade existing leads store to remove unique constraint
                    const transaction = event.target.transaction;
                    const leadsStore = transaction.objectStore('leads');
                    
                    // Delete old unique index if it exists
                    if (leadsStore.indexNames.contains('company')) {
                        leadsStore.deleteIndex('company');
                    }
                    
                    // Create new non-unique index
                    leadsStore.createIndex('company', 'company');
                }
                
                // Config store
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }

                // Notepad store
                if (!db.objectStoreNames.contains('notepad')) {
                    db.createObjectStore('notepad', { keyPath: 'id' });
                }

                // Custom Queues store
                if (!db.objectStoreNames.contains('customQueues')) {
                    db.createObjectStore('customQueues', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    // Configuration Management
    async loadConfig() {
        try {
            const configData = await this.getFromStorage('config');
            if (configData) {
                this.config = { ...this.config, ...configData };
            }
            this.updateConfigUI();
        } catch (error) {
            console.error('Error loading config:', error);
        }
    }

    async saveConfig() {
        try {
            await this.saveToStorage('config', this.config);
            this.showMessage('Configuration saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving config:', error);
            this.showMessage('Error saving configuration', 'error');
        }
    }

    updateConfigUI() {
        document.getElementById('callQueueDays').value = this.config.callQueueDays;
        document.getElementById('smtpServer').value = this.config.smtpServer;
        document.getElementById('smtpPort').value = this.config.smtpPort;
        document.getElementById('smtpUser').value = this.config.smtpUser;
        document.getElementById('smtpPass').value = this.config.smtpPass;
    }

    // Event Listeners
    setupEventListeners() {
        // Tab navigation (only main navigation tabs, not modal tabs)
        document.querySelectorAll('nav .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Lead management
        document.getElementById('importCsvBtn').addEventListener('click', () => this.importCSV());
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportCSV());
        document.getElementById('addLeadBtn').addEventListener('click', () => this.showLeadModal());
        document.getElementById('editLeadBtn').addEventListener('click', () => this.editLead());
        document.getElementById('deleteLeadBtn').addEventListener('click', () => this.deleteLead());

        // Filters
        document.getElementById('stateFilter').addEventListener('change', () => this.updateLeadsView());
        document.getElementById('industryFilter').addEventListener('change', () => this.updateLeadsView());
        document.getElementById('searchInput').addEventListener('input', () => this.updateLeadsView());

        // Queue filters
        document.getElementById('queueStateFilter').addEventListener('change', () => this.updateCallQueue());
        document.getElementById('queueIndustryFilter').addEventListener('change', () => this.updateCallQueue());
        document.getElementById('notesFilter').addEventListener('input', () => this.updateCallQueue());

        // Email filters
        document.getElementById('emailStateFilter').addEventListener('change', () => this.updateEmailList());
        document.getElementById('emailIndustryFilter').addEventListener('change', () => this.updateEmailList());

        // Current lead actions
        document.getElementById('copyPhoneBtn').addEventListener('click', () => this.copyCurrentPhone());
        document.getElementById('visitWebsiteBtn').addEventListener('click', () => this.visitCurrentWebsite());
        document.getElementById('markCalledBtn').addEventListener('click', () => this.showCallNotesModal());

        // Email actions
        document.getElementById('selectAllEmails').addEventListener('change', (e) => this.toggleAllEmails(e.target.checked));
        document.getElementById('sendEmailsBtn').addEventListener('click', () => this.sendEmails());

        // Settings
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportAllData());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelModal').addEventListener('click', () => this.closeModal());
        document.getElementById('saveModal').addEventListener('click', () => this.saveLead());

        document.getElementById('closeCallNotesModal').addEventListener('click', () => this.closeCallNotesModal());
        document.getElementById('cancelCallNotes').addEventListener('click', () => this.closeCallNotesModal());
        document.getElementById('saveCallNotes').addEventListener('click', () => this.saveCallNotes());
        
        // Meeting details toggle
        document.getElementById('callOutcome').addEventListener('change', (e) => {
            const meetingDetailsGroup = document.getElementById('meetingDetailsGroup');
            if (e.target.value === 'meeting_set') {
                meetingDetailsGroup.style.display = 'block';
            } else {
                meetingDetailsGroup.style.display = 'none';
            }
        });

        // CSV file input
        document.getElementById('csvFileInput').addEventListener('change', (e) => this.handleCSVFile(e));

        // Map button
        document.getElementById('viewMapBtn').addEventListener('click', () => this.viewStateMap());

        // Queue management
        document.getElementById('manageQueuesBtn').addEventListener('click', () => this.showQueueManagementModal());
        document.getElementById('queueSelector').addEventListener('change', (e) => this.loadSelectedQueue(e.target.value));
        document.getElementById('closeQueueModal').addEventListener('click', () => this.closeQueueManagementModal());
        document.getElementById('cancelQueueModal').addEventListener('click', () => this.closeQueueManagementModal());
        document.getElementById('saveQueueModal').addEventListener('click', () => this.createCustomQueue());

        // Pagination controls
        document.getElementById('firstPageBtn').addEventListener('click', () => this.goToPage(1));
        document.getElementById('prevPageBtn').addEventListener('click', () => this.goToPage(this.pagination.currentPage - 1));
        document.getElementById('nextPageBtn').addEventListener('click', () => this.goToPage(this.pagination.currentPage + 1));
        document.getElementById('lastPageBtn').addEventListener('click', () => this.goToPage(this.pagination.totalPages));
        document.getElementById('pageSizeSelect').addEventListener('change', (e) => this.changePageSize(parseInt(e.target.value)));

        // Use event delegation for page numbers
        document.getElementById('pageNumbers').addEventListener('click', (e) => {
            if (e.target.classList.contains('page-number')) {
                const pageNumber = parseInt(e.target.textContent);
                this.goToPage(pageNumber);
            }
        });

        // Call Log Pagination Event Listeners
        document.getElementById('callLogFirstPageBtn').addEventListener('click', () => this.goToCallLogPage(1));
        document.getElementById('callLogPrevPageBtn').addEventListener('click', () => this.goToCallLogPage(this.callLogPagination.currentPage - 1));
        document.getElementById('callLogNextPageBtn').addEventListener('click', () => this.goToCallLogPage(this.callLogPagination.currentPage + 1));
        document.getElementById('callLogLastPageBtn').addEventListener('click', () => this.goToCallLogPage(this.callLogPagination.totalPages));
        document.getElementById('callLogPageSizeSelect').addEventListener('change', (e) => this.changeCallLogPageSize(parseInt(e.target.value)));

        // Use event delegation for call log page numbers
        document.getElementById('callLogPageNumbers').addEventListener('click', (e) => {
            if (e.target.classList.contains('page-number')) {
                const pageNumber = parseInt(e.target.textContent);
                this.goToCallLogPage(pageNumber);
            }
        });

        // Prospecting event listeners
        document.getElementById('runThomasnetScraperBtn').addEventListener('click', () => this.showScraperWidget());
        document.getElementById('importProspectsBtn').addEventListener('click', () => this.importProspects());
        document.getElementById('reviewProspectsBtn').addEventListener('click', () => this.showProspectReviewModal());
        document.getElementById('finalizeProspectsBtn').addEventListener('click', () => this.finalizeProspects());
        document.getElementById('deleteAllProspectsBtn').addEventListener('click', () => this.deleteAllProspects());
        
        // Pipeline stage buttons
        document.getElementById('viewUnreviewedBtn').addEventListener('click', () => this.filterProspectsByStage('unreviewed'));
        document.getElementById('reviewUnreviewedBtn').addEventListener('click', () => this.reviewProspectsByStage('unreviewed'));
        document.getElementById('viewFinalizedBtn').addEventListener('click', () => this.filterProspectsByStage('finalized'));
        document.getElementById('importFinalizedBtn').addEventListener('click', () => this.finalizeProspects());
        document.getElementById('viewUnqualifiedBtn').addEventListener('click', () => this.filterProspectsByStage('unqualified'));
        
        // Prospecting filters
        document.getElementById('prospectingStageFilter').addEventListener('change', () => this.updateProspectingView());
        document.getElementById('prospectingStateFilter').addEventListener('change', () => this.updateProspectingView());
        document.getElementById('prospectingServiceFilter').addEventListener('change', () => this.updateProspectingView());
        document.getElementById('prospectingSearchInput').addEventListener('input', () => this.updateProspectingView());
        
        // Prospecting pagination
        document.getElementById('prospectingFirstPageBtn').addEventListener('click', () => this.goToProspectingPage(1));
        document.getElementById('prospectingPrevPageBtn').addEventListener('click', () => this.goToProspectingPage(this.prospectingPagination.currentPage - 1));
        document.getElementById('prospectingNextPageBtn').addEventListener('click', () => this.goToProspectingPage(this.prospectingPagination.currentPage + 1));
        document.getElementById('prospectingLastPageBtn').addEventListener('click', () => this.goToProspectingPage(this.prospectingPagination.totalPages));
        document.getElementById('prospectingPageSizeSelect').addEventListener('change', (e) => this.changeProspectingPageSize(parseInt(e.target.value)));
        
        // Prospecting page numbers
        document.getElementById('prospectingPageNumbers').addEventListener('click', (e) => {
            if (e.target.classList.contains('page-number')) {
                const pageNumber = parseInt(e.target.textContent);
                this.goToProspectingPage(pageNumber);
            }
        });
        
        // Prospect review modal
        document.getElementById('closeProspectReviewModal').addEventListener('click', () => this.closeProspectReviewModal());
        document.getElementById('cancelProspectReview').addEventListener('click', () => this.closeProspectReviewModal());
        document.getElementById('saveProspectReview').addEventListener('click', () => this.saveProspectReview());
        
        // Prospect CSV file input
        document.getElementById('prospectCsvFileInput').addEventListener('change', (e) => this.handleProspectCSVFile(e));
        
        // Modal tab navigation (prospect review modal)
        document.querySelectorAll('#prospectReviewModal .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchModalTab(e.target.dataset.tab));
        });
        
        // Modal tab navigation (queue management modal)
        document.querySelectorAll('#queueManagementModal .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchQueueModalTab(e.target.dataset.tab));
        });
        
        // Prospecting table select all checkbox
        document.getElementById('selectAllProspects').addEventListener('change', (e) => this.toggleAllProspects(e.target.checked));
        
        // Prospecting bulk actions
        document.getElementById('bulkApproveBtn').addEventListener('click', () => this.bulkApproveProspects());
        document.getElementById('bulkRejectBtn').addEventListener('click', () => this.bulkRejectProspects());
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => this.bulkDeleteProspects());
        
        // Prospecting review modal select all checkbox
        document.getElementById('selectAllReviewProspects').addEventListener('change', (e) => this.toggleAllReviewProspects(e.target.checked));
        
        // Event delegation for prospecting table action buttons
        document.getElementById('prospectingTableBody').addEventListener('click', (e) => {
            if (e.target.closest('.prospect-view-btn')) {
                const prospectId = parseFloat(e.target.closest('.prospect-view-btn').dataset.id);
                this.viewProspect(prospectId);
            } else if (e.target.closest('.prospect-edit-btn')) {
                const prospectId = parseFloat(e.target.closest('.prospect-edit-btn').dataset.id);
                this.editProspect(prospectId);
            } else if (e.target.closest('.prospect-delete-btn')) {
                const prospectId = parseFloat(e.target.closest('.prospect-delete-btn').dataset.id);
                this.deleteProspect(prospectId);
            }
        });
        
        // Event delegation for review modal table action buttons
        document.getElementById('prospectReviewTableBody').addEventListener('click', (e) => {
            if (e.target.closest('.review-prospect-view-btn')) {
                const prospectId = parseFloat(e.target.closest('.review-prospect-view-btn').dataset.id);
                this.viewProspectDetails(prospectId);
            }
        });

        // Column resizing
        this.setupColumnResizing();

        // Dashboard functionality
        this.setupDashboard();
        
        // Mini queue call button
        document.getElementById('miniCallBtn').addEventListener('click', () => this.handleMiniCall());
        

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // Set up event delegation for dynamic elements
        this.setupDynamicEventListeners();
    }

    setupDynamicEventListeners() {
        // Use event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            // Handle copy phone buttons
            if (e.target.closest('.copy-phone-btn')) {
                const button = e.target.closest('.copy-phone-btn');
                const phone = button.dataset.phone;
                this.copyPhone(phone);
            }
            
            // Handle copy phone links
            if (e.target.closest('.copy-phone-link')) {
                const link = e.target.closest('.copy-phone-link');
                const phone = link.dataset.phone;
                this.copyPhone(phone);
            }
            
            // Handle mark called buttons
            if (e.target.closest('.mark-called-btn')) {
                const button = e.target.closest('.mark-called-btn');
                const leadId = parseInt(button.dataset.leadId);
                this.markLeadCalled(leadId);
            }
        });
    }

    // Tab Management
    switchTab(tabName) {
        try {
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Find and activate the correct tab button
            const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
            if (tabButton) {
                tabButton.classList.add('active');
            } else {
                console.warn(`Tab button not found for: ${tabName}`);
            }

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Find and activate the correct tab content
            const tabContent = document.getElementById(tabName);
            if (tabContent) {
                tabContent.classList.add('active');
            } else {
                console.warn(`Tab content not found for: ${tabName}`);
            }
        } catch (error) {
            console.error('Error switching tab:', error, 'Tab name:', tabName);
        }

        // Update views when switching tabs
        if (tabName === 'leads') {
            this.updateLeadsView();
        } else if (tabName === 'queue') {
            this.updateCallQueue();
        } else if (tabName === 'email') {
            this.updateEmailList();
        } else if (tabName === 'meetings') {
            this.updateMeetingsList();
        } else if (tabName === 'dashboard') {
            this.updateDashboard();
        } else if (tabName === 'prospecting') {
            this.updateProspectingView();
        }
    }


    calculateStats(leads) {
        const today = new Date().toISOString().split('T')[0];
        const queueThreshold = new Date(Date.now() - this.config.callQueueDays * 24 * 60 * 60 * 1000).toISOString();

        const stats = {
            totalLeads: leads.length,
            queueCount: 0,
            calledToday: 0,
            geoDistribution: {},
            industryDistribution: {},
            callOutcomes: {
                spoke_w_contact: 0,
                receptionist: 0,
                not_interested: 0,
                voicemail: 0,
                spoke_w_contact: 0,
                no_answer: 0
            }
        };

        leads.forEach(lead => {
            // Queue count
            if (!lead.lastCalled || lead.lastCalled < queueThreshold) {
                stats.queueCount++;
            }

            // Called today
            if (lead.lastCalled && lead.lastCalled.startsWith(today)) {
                stats.calledToday++;
            }

            // Call outcomes
            if (lead.callOutcome && stats.callOutcomes.hasOwnProperty(lead.callOutcome)) {
                stats.callOutcomes[lead.callOutcome]++;
            }

            // Geographic distribution
            if (lead.state) {
                stats.geoDistribution[lead.state] = (stats.geoDistribution[lead.state] || 0) + 1;
            }

            // Industry distribution
            if (lead.industry) {
                stats.industryDistribution[lead.industry] = (stats.industryDistribution[lead.industry] || 0) + 1;
            }
        });

        return stats;
    }

    updateGeoStats(geoDistribution) {
        const container = document.getElementById('geoStats');
        container.innerHTML = '';

        const sortedStates = Object.entries(geoDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        sortedStates.forEach(([state, count]) => {
            const row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML = `
                <span>${state}</span>
                <span>${count}</span>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${(count / Math.max(...Object.values(geoDistribution))) * 100}%"></div>
                </div>
            `;
            container.appendChild(row);
        });
    }

    updateIndustryStats(industryDistribution) {
        const container = document.getElementById('industryStats');
        container.innerHTML = '';

        const sortedIndustries = Object.entries(industryDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        sortedIndustries.forEach(([industry, count]) => {
            const row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML = `
                <span>${industry}</span>
                <span>${count}</span>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${(count / Math.max(...Object.values(industryDistribution))) * 100}%"></div>
                </div>
            `;
            container.appendChild(row);
        });
    }


    updateCharts(stats) {
        // Simple chart implementation - could be enhanced with Chart.js
        const canvas = document.getElementById('leadChartCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw a simple pie chart
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        let currentAngle = 0;
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'];

        Object.entries(stats.industryDistribution).slice(0, 5).forEach(([industry, count], index) => {
            const sliceAngle = (count / stats.totalLeads) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();

            currentAngle += sliceAngle;
        });
    }

    updateCallAnalytics(callOutcomes) {
        const container = document.getElementById('callAnalytics');
        container.innerHTML = '';

        const outcomeLabels = {
            answered: 'Answered',
            receptionist: 'Receptionist',
            not_interested: 'Not Interested',
            voicemail: 'Voicemail',
            spoke_w_contact: 'Spoke w/ Contact',
            no_answer: 'No Answer'
        };

        const outcomeColors = {
            answered: '#2ecc71',
            receptionist: '#f39c12',
            not_interested: '#e74c3c',
            voicemail: '#9b59b6',
            spoke_w_contact: '#95a5a6',
            no_answer: '#34495e'
        };

        const totalCalls = Object.values(callOutcomes).reduce((sum, count) => sum + count, 0);

        if (totalCalls === 0) {
            container.innerHTML = '<div class="text-muted">No call data yet</div>';
            return;
        }

        Object.entries(callOutcomes).forEach(([outcome, count]) => {
            if (count > 0) {
                const percentage = ((count / totalCalls) * 100).toFixed(1);
                const row = document.createElement('div');
                row.className = 'stat-row';
                row.innerHTML = `
                    <span style="color: ${outcomeColors[outcome]}">${outcomeLabels[outcome]}</span>
                    <span>${count} (${percentage}%)</span>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${percentage}%; background: ${outcomeColors[outcome]}"></div>
                    </div>
                `;
                container.appendChild(row);
            }
        });
    }

    // Lead Management
    async getAllLeads() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('Database not initialized');
                resolve([]);
                return;
            }
            
            try {
                const transaction = this.db.transaction(['leads'], 'readonly');
                const store = transaction.objectStore('leads');
                const request = store.getAll();

                request.onsuccess = () => {
                    const result = request.result || [];
                    resolve(result);
                };
                request.onerror = () => {
                    console.error('getAllLeads error:', request.error);
                    reject(request.error);
                };
            } catch (error) {
                console.error('getAllLeads transaction error:', error);
                resolve([]);
            }
        });
    }

    async addLead(leadData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['leads'], 'readwrite');
            const store = transaction.objectStore('leads');
            const request = store.add(leadData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateLead(id, leadData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['leads'], 'readwrite');
            const store = transaction.objectStore('leads');
            const request = store.put({ ...leadData, id });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteLeadById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['leads'], 'readwrite');
            const store = transaction.objectStore('leads');
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Views Updates
    async updateLeadsView() {
        try {
            const leads = await this.getAllLeads();
            
            // Store all leads for use in Create Queue selection
            this.allLeads = leads;
            
            // Ensure leads is an array
            if (!Array.isArray(leads)) {
                console.error('getAllLeads returned invalid data:', leads);
                this.renderLeadsTable([]);
                return;
            }
            
            const filteredLeads = this.filterLeads(leads, 'leads');
            this.updatePagination(filteredLeads.length);
            const paginatedLeads = this.getPaginatedLeads(filteredLeads);
            this.renderLeadsTable(paginatedLeads);
            this.updatePaginationControls();
            this.updateFilterOptions();
        } catch (error) {
            console.error('Error updating leads view:', error);
            this.renderLeadsTable([]);
        }
    }

    async updateCallQueue() {
        try {
            const leads = await this.getAllLeads();
            
            // Ensure leads is an array
            if (!Array.isArray(leads)) {
                console.error('getAllLeads returned invalid data:', leads);
                this.renderQueueTable([]);
                this.updateCurrentLead(null);
                return;
            }
            
            const queueLeads = await this.getQueueLeads(leads);
            const filteredLeads = this.filterLeads(queueLeads, 'queue');
            
            this.renderQueueTable(filteredLeads);
            this.updateCurrentLead(filteredLeads[0]);
        } catch (error) {
            console.error('Error updating call queue:', error);
            this.renderQueueTable([]);
            this.updateCurrentLead(null);
        }
    }

    async updateEmailList() {
        try {
            const leads = await this.getAllLeads();
            
            // Ensure leads is an array
            if (!Array.isArray(leads)) {
                console.error('getAllLeads returned invalid data:', leads);
                this.renderEmailTable([]);
                return;
            }
            
            const filteredLeads = this.filterLeads(leads, 'email');
            this.renderEmailTable(filteredLeads);
        } catch (error) {
            console.error('Error updating email list:', error);
            this.renderEmailTable([]);
        }
    }

    async updateAllViews() {
        this.updateLeadsView();
        this.updateCallQueue();
        this.updateEmailList();
        await this.updateDashboard();
        await this.updateProspectingView();
        // Ensure queue selector is updated with all available queues
        this.updateQueueSelector();
    }

    // Filtering Logic
    filterLeads(leads, viewType) {
        let filtered = [...leads];

        if (viewType === 'leads') {
            const stateFilter = document.getElementById('stateFilter').value;
            const industryFilter = document.getElementById('industryFilter').value;
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();

            if (stateFilter !== 'all') {
                filtered = filtered.filter(lead => lead.state === stateFilter);
            }

            if (industryFilter !== 'all') {
                filtered = filtered.filter(lead => lead.industry === industryFilter);
            }

            if (searchTerm) {
                filtered = filtered.filter(lead => 
                    lead.company.toLowerCase().includes(searchTerm) ||
                    lead.contact?.toLowerCase().includes(searchTerm) ||
                    lead.email?.toLowerCase().includes(searchTerm)
                );
            }
        } else if (viewType === 'queue') {
            const stateFilter = document.getElementById('queueStateFilter').value;
            const industryFilter = document.getElementById('queueIndustryFilter').value;
            const notesFilter = document.getElementById('notesFilter').value.toLowerCase();

            if (stateFilter !== 'all') {
                filtered = filtered.filter(lead => lead.state === stateFilter);
            }

            if (industryFilter !== 'all') {
                filtered = filtered.filter(lead => lead.industry === industryFilter);
            }

            if (notesFilter) {
                filtered = filtered.filter(lead => 
                    lead.notes?.toLowerCase().includes(notesFilter)
                );
            }
        } else if (viewType === 'email') {
            const stateFilter = document.getElementById('emailStateFilter').value;
            const industryFilter = document.getElementById('emailIndustryFilter').value;

            if (stateFilter !== 'all') {
                filtered = filtered.filter(lead => lead.state === stateFilter);
            }

            if (industryFilter !== 'all') {
                filtered = filtered.filter(lead => lead.industry === industryFilter);
            }
        }

        return filtered;
    }


    // Table Rendering
    renderLeadsTable(leads) {
        const tbody = document.getElementById('leadsTableBody');
        tbody.innerHTML = '';

        leads.forEach(lead => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lead.company}</td>
                <td>${lead.website ? `<a href="${lead.website}" target="_blank">Visit</a>` : '-'}</td>
                <td>${lead.lastCalled ? this.formatDate(lead.lastCalled) : 'Never'}</td>
                <td>${lead.state || '-'}</td>
                <td>${lead.industry || '-'}</td>
                <td>${this.formatPhoneNumbers(lead.phone)}</td>
                <td>${lead.contact || '-'}</td>
                <td>${this.formatEmailAddresses(lead.email)}</td>
                <td>
                    <button class="btn btn-sm btn-primary copy-phone-btn" data-phone="${lead.phone || ''}">
                        <i class="fas fa-copy"></i>
                    </button>
                </td>
            `;
            row.addEventListener('click', () => this.selectTableRow(row));
            tbody.appendChild(row);
        });
    }

    renderQueueTable(leads) {
        const tbody = document.getElementById('queueTableBody');
        if (!tbody) {
            console.error('Queue table body element not found');
            return;
        }

        // Update pagination info
        this.updateCallLogPagination(leads.length);
        
        // Get paginated leads
        const paginatedLeads = this.getPaginatedCallLogLeads(leads);
        
        // Clear existing content
        tbody.innerHTML = '';

        if (paginatedLeads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">No leads in queue</td></tr>';
            this.updateCallLogPaginationControls();
            return;
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();

        paginatedLeads.forEach(lead => {
            const row = document.createElement('tr');
            
            // Safely format data
            const company = lead.company || 'Unknown Company';
            const contact = lead.contact || '-';
            const state = lead.state || '-';
            const industry = lead.industry || '-';
            const email = this.formatEmailAddresses(lead.email);
            const lastCalled = lead.lastCalled ? this.formatDate(lead.lastCalled) : 'Never';
            const phone = this.formatPhoneNumbers(lead.phone);
            const notes = lead.notes ? 
                (lead.notes.length > 50 ? lead.notes.substring(0, 50) + '...' : lead.notes) : 
                '-';
            
            row.innerHTML = `
                <td>${lead.id}</td>
                <td>${company}</td>
                <td>${contact}</td>
                <td>${state}</td>
                <td>${industry}</td>
                <td>${email}</td>
                <td>${lastCalled}</td>
                <td>${phone}</td>
                <td>${notes}</td>
                <td>
                    <button class="btn btn-sm btn-success mark-called-btn" data-lead-id="${lead.id}" title="Mark as Called">
                        <i class="fas fa-phone"></i> Called
                    </button>
                </td>
            `;
            
            fragment.appendChild(row);
        });
        
        // Append all rows at once for better performance
        tbody.appendChild(fragment);
        
        // Update pagination controls
        this.updateCallLogPaginationControls();
    }

    renderEmailTable(leads) {
        const tbody = document.getElementById('emailTableBody');
        tbody.innerHTML = '';

        leads.forEach(lead => {
            if (!lead.email) return;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="email-checkbox" data-email="${lead.email}"></td>
                <td>${lead.id}</td>
                <td>${lead.company}</td>
                <td>${lead.contact || '-'}</td>
                <td>${lead.email}</td>
            `;
            tbody.appendChild(row);
        });

        this.updateRecipientCount();
    }

    // Current Lead Management
    updateCurrentLead(lead) {
        if (!lead) {
            this.clearCurrentLead();
            return;
        }

        this.currentLeadId = lead.id;
        document.getElementById('currentCompany').textContent = lead.company;
        document.getElementById('currentContact').textContent = lead.contact || '-';
        document.getElementById('currentEmail').innerHTML = this.formatEmailAddresses(lead.email);
        document.getElementById('currentIndustry').textContent = lead.industry || '-';
        document.getElementById('currentState').textContent = lead.state || '-';
        document.getElementById('currentPhone').innerHTML = this.formatPhoneNumbers(lead.phone);
        document.getElementById('currentWebsite').textContent = lead.website || '-';
        document.getElementById('currentNotes').textContent = lead.notes || '-';
    }

    clearCurrentLead() {
        this.currentLeadId = null;
        document.getElementById('currentCompany').textContent = '-';
        document.getElementById('currentContact').textContent = '-';
        document.getElementById('currentEmail').textContent = '-';
        document.getElementById('currentIndustry').textContent = '-';
        document.getElementById('currentState').textContent = '-';
        document.getElementById('currentPhone').textContent = '-';
        document.getElementById('currentWebsite').textContent = '-';
        document.getElementById('currentNotes').textContent = '-';
    }

    // Filter Options Update
    async updateFilterOptions() {
        try {
            const leads = await this.getAllLeads();
            const states = [...new Set(leads.map(lead => lead.state).filter(Boolean))].sort();
            const industries = [...new Set(leads.map(lead => lead.industry).filter(Boolean))].sort();

            this.updateSelectOptions('stateFilter', states);
            this.updateSelectOptions('industryFilter', industries);
            this.updateSelectOptions('queueStateFilter', states);
            this.updateSelectOptions('queueIndustryFilter', industries);
            this.updateSelectOptions('emailStateFilter', states);
            this.updateSelectOptions('emailIndustryFilter', industries);
        } catch (error) {
            console.error('Error updating filter options:', error);
        }
    }

    updateSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        select.innerHTML = '<option value="all">All ' + selectId.replace('Filter', 's') + '</option>';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });

        if (options.includes(currentValue)) {
            select.value = currentValue;
        }
    }

    // Modal Management
    showLeadModal(leadData = null) {
        const modal = document.getElementById('leadModal');
        const title = document.getElementById('modalTitle');
        
        if (leadData) {
            title.textContent = 'Edit Lead';
            this.populateLeadForm(leadData);
        } else {
            title.textContent = 'Add Lead';
            this.clearLeadForm();
        }
        
        modal.classList.add('show');
    }

    closeModal() {
        document.getElementById('leadModal').classList.remove('show');
    }

    clearLeadForm() {
        document.getElementById('modalCompany').value = '';
        document.getElementById('modalContact').value = '';
        document.getElementById('modalEmail').value = '';
        document.getElementById('modalIndustry').value = '';
        document.getElementById('modalState').value = '';
        document.getElementById('modalWebsite').value = '';
        document.getElementById('modalPhone').value = '';
        document.getElementById('modalComments').value = '';
        document.getElementById('modalNotes').value = '';
    }

    populateLeadForm(leadData) {
        document.getElementById('modalCompany').value = leadData.company || '';
        document.getElementById('modalContact').value = leadData.contact || '';
        document.getElementById('modalEmail').value = leadData.email || '';
        document.getElementById('modalIndustry').value = leadData.industry || '';
        document.getElementById('modalState').value = leadData.state || '';
        document.getElementById('modalWebsite').value = leadData.website || '';
        document.getElementById('modalPhone').value = leadData.phone || '';
        document.getElementById('modalComments').value = leadData.comments || '';
        document.getElementById('modalNotes').value = leadData.notes || '';
    }

    async saveLead() {
        const formData = {
            company: document.getElementById('modalCompany').value.trim(),
            contact: document.getElementById('modalContact').value.trim(),
            email: document.getElementById('modalEmail').value.trim(),
            industry: document.getElementById('modalIndustry').value.trim(),
            state: document.getElementById('modalState').value.trim(),
            website: document.getElementById('modalWebsite').value.trim(),
            phone: document.getElementById('modalPhone').value.trim(),
            comments: document.getElementById('modalComments').value.trim(),
            notes: document.getElementById('modalNotes').value.trim(),
            dateAdded: new Date().toISOString()
        };

        if (!formData.company) {
            this.showMessage('Company name is required', 'error');
            return;
        }

        try {
            const modalTitle = document.getElementById('modalTitle').textContent;
            if (modalTitle === 'Add Lead') {
                await this.addLead(formData);
                this.showMessage('Lead added successfully!', 'success');
            } else {
                // Edit mode - need to get the lead ID
                const selectedRow = document.querySelector('.leads-table tbody tr.selected');
                if (selectedRow) {
                    const leadId = parseInt(selectedRow.cells[0].textContent);
                    await this.updateLead(leadId, formData);
                    this.showMessage('Lead updated successfully!', 'success');
                }
            }

            this.closeModal();
            await this.updateAllViews();
        } catch (error) {
            console.error('Error saving lead:', error);
            this.showMessage('Error saving lead: ' + error.message, 'error');
        }
    }

    // Call Notes Modal
    showCallNotesModal(preselectedOutcome = null) {
        if (!this.currentLeadId) {
            this.showMessage('No lead selected', 'error');
            return;
        }
        
        // Pre-select the outcome if provided, otherwise leave empty for user to choose
        if (preselectedOutcome) {
            document.getElementById('callOutcome').value = preselectedOutcome;
        } else {
            document.getElementById('callOutcome').value = '';
        }
        
        document.getElementById('callNotesModal').classList.add('show');
    }

    closeCallNotesModal() {
        document.getElementById('callNotesModal').classList.remove('show');
        document.getElementById('callNotesText').value = '';
    }

    async saveCallNotes() {
        const notes = document.getElementById('callNotesText').value.trim();
        const outcome = document.getElementById('callOutcome').value;
        const now = new Date().toISOString();

        if (!outcome) {
            this.showMessage('Please select a call outcome', 'error');
            return;
        }

        try {
            const lead = await this.getLeadById(this.currentLeadId);
            let callEntry = `${now} [${outcome.toUpperCase()}]: ${notes}`;
            
            // Handle meeting data if outcome is "meeting_set"
            let meetingData = null;
            if (outcome === 'meeting_set') {
                const meetingDate = document.getElementById('meetingDate').value;
                const meetingTime = document.getElementById('meetingTime').value;
                const meetingNotes = document.getElementById('meetingNotes').value;
                const googleCalendarLink = document.getElementById('googleCalendarLink').value;

                if (!meetingDate || !meetingTime) {
                    this.showMessage('Please enter meeting date and time', 'error');
                    return;
                }

                meetingData = {
                    date: meetingDate,
                    time: meetingTime,
                    notes: meetingNotes,
                    googleCalendarLink: googleCalendarLink,
                    status: 'upcoming',
                    createdAt: now
                };

                callEntry += `\nMeeting: ${meetingDate} at ${meetingTime}`;
                if (meetingNotes) {
                    callEntry += `\nAgenda: ${meetingNotes}`;
                }
                if (googleCalendarLink) {
                    callEntry += `\nCalendar: ${googleCalendarLink}`;
                }
            }
            
            const updatedNotes = lead.notes ? `${lead.notes}\n\n${callEntry}` : callEntry;
            
            await this.updateLead(this.currentLeadId, {
                ...lead,
                lastCalled: now,
                callOutcome: outcome,
                notes: updatedNotes,
                meetingData: meetingData
            });

            this.closeCallNotesModal();
            await this.updateAllViews();
            this.showMessage(`Call marked as ${outcome}!`, 'success');
        } catch (error) {
            console.error('Error saving call notes:', error);
            this.showMessage('Error saving call notes', 'error');
        }
    }

    async getLeadById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['leads'], 'readonly');
            const store = transaction.objectStore('leads');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Actions
    async editLead() {
        const selectedRow = document.querySelector('.leads-table tbody tr.selected');
        if (!selectedRow) {
            this.showMessage('Please select a lead to edit', 'error');
            return;
        }

        const leadId = parseInt(selectedRow.cells[0].textContent);
        try {
            const lead = await this.getLeadById(leadId);
            this.showLeadModal(lead);
        } catch (error) {
            console.error('Error getting lead:', error);
            this.showMessage('Error loading lead data', 'error');
        }
    }

    async deleteLead() {
        const selectedRow = document.querySelector('.leads-table tbody tr.selected');
        if (!selectedRow) {
            this.showMessage('Please select a lead to delete', 'error');
            return;
        }

        const leadId = parseInt(selectedRow.cells[0].textContent);
        const companyName = selectedRow.cells[1].textContent;

        if (!confirm(`Are you sure you want to delete ${companyName}?`)) {
            return;
        }

        try {
            await this.deleteLeadById(leadId);
            this.showMessage('Lead deleted successfully!', 'success');
            await this.updateAllViews();
        } catch (error) {
            console.error('Error deleting lead:', error);
            this.showMessage('Error deleting lead', 'error');
        }
    }

    selectTableRow(row) {
        document.querySelectorAll('.leads-table tbody tr').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
    }

    // Phone and Website Actions
    copyPhone(phone) {
        if (!phone || phone === '-') {
            this.showMessage('No phone number available', 'error');
            return;
        }

        // Clean the phone number for copying (remove formatting)
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = this.formatPhoneNumber(phone);

        navigator.clipboard.writeText(cleanPhone).then(() => {
            this.showMessage(`Copied ${formattedPhone} to clipboard`, 'success');
        }).catch(() => {
            this.showMessage('Failed to copy phone number', 'error');
        });
    }

    copyCurrentPhone() {
        const phone = document.getElementById('currentPhone').textContent;
        this.copyPhone(phone);
    }

    visitCurrentWebsite() {
        const website = document.getElementById('currentWebsite').textContent;
        if (website && website !== '-') {
            chrome.tabs.create({ url: website });
        } else {
            this.showMessage('No website available', 'error');
        }
    }

    viewStateMap() {
        const state = document.getElementById('stateFilter').value;
        if (state !== 'all') {
            chrome.tabs.create({ url: `https://www.google.com/maps/place/${state}` });
        } else {
            this.showMessage('Please select a state first', 'error');
        }
    }

    // Email Management
    toggleAllEmails(checked) {
        document.querySelectorAll('.email-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateRecipientCount();
    }

    updateRecipientCount() {
        const checkedBoxes = document.querySelectorAll('.email-checkbox:checked');
        document.getElementById('recipientCount').textContent = checkedBoxes.length;
    }

    async sendEmails() {
        const subject = document.getElementById('emailSubject').value.trim();
        const body = document.getElementById('emailBody').value.trim();
        const checkedBoxes = document.querySelectorAll('.email-checkbox:checked');

        if (!subject || !body) {
            this.showMessage('Please enter subject and message', 'error');
            return;
        }

        if (checkedBoxes.length === 0) {
            this.showMessage('Please select recipients', 'error');
            return;
        }

        if (!this.config.smtpServer || !this.config.smtpUser || !this.config.smtpPass) {
            this.showMessage('Please configure SMTP settings first', 'error');
            return;
        }

        // For Chrome extension, we'll use a simple approach
        // In a real implementation, you'd need a backend service for email sending
        this.showMessage(`Would send email to ${checkedBoxes.length} recipients (SMTP not available in extension)`, 'info');
    }

    // Settings
    async saveSettings() {
        this.config.callQueueDays = parseInt(document.getElementById('callQueueDays').value);
        this.config.smtpServer = document.getElementById('smtpServer').value.trim();
        this.config.smtpPort = parseInt(document.getElementById('smtpPort').value);
        this.config.smtpUser = document.getElementById('smtpUser').value.trim();
        this.config.smtpPass = document.getElementById('smtpPass').value.trim();

        await this.saveConfig();
        this.updateCallQueue();
    }

    async exportAllData() {
        try {
            const leads = await this.getAllLeads();
            const data = {
                leads: leads,
                config: this.config,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `crm-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showMessage('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showMessage('Error exporting data', 'error');
        }
    }

    async clearAllData() {
        if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            return;
        }

        try {
            const transaction = this.db.transaction(['leads'], 'readwrite');
            const store = transaction.objectStore('leads');
            await store.clear();
            
            await this.updateAllViews();
            this.showMessage('All data cleared successfully!', 'success');
        } catch (error) {
            console.error('Error clearing data:', error);
            this.showMessage('Error clearing data', 'error');
        }
    }

    // CSV Import/Export
    importCSV() {
        document.getElementById('csvFileInput').click();
    }

    async handleCSVFile(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        if (files.length === 1) {
            // Single file - use existing logic
            const reader = new FileReader();
            reader.onload = (e) => {
                const csv = e.target.result;
                this.parseCSV(csv, files[0].name);
            };
            reader.readAsText(files[0]);
        } else {
            // Multiple files - process them all
            this.showMessage(`Importing ${files.length} CSV files...`, 'info');
            this.processMultipleCSVFiles(files);
        }
    }

    async processMultipleCSVFiles(files) {
        let totalImported = 0;
        let totalSkipped = 0;
        let processedFiles = 0;

        for (const file of files) {
            try {
                const csv = await this.readFileAsText(file);
                const result = await this.parseCSV(csv, file.name);
                totalImported += result.imported;
                totalSkipped += result.skipped;
                processedFiles++;
                
                this.showMessage(`Processed ${processedFiles}/${files.length} files...`, 'info');
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
            }
        }

        this.showMessage(`Import complete! Processed ${processedFiles} files. Imported ${totalImported} leads, skipped ${totalSkipped} duplicates`, 'success');
        await this.updateAllViews();
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        result.push(current.trim());
        
        // Remove quotes from each field
        return result.map(field => field.replace(/^"(.*)"$/, '$1'));
    }

    async parseCSV(csv, filename = 'CSV') {
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length === 0) return { imported: 0, skipped: 0 };
        
        const headers = this.parseCSVLine(lines[0]);
        console.log('CSV Headers:', headers); // Debug log
        
        let imported = 0;
        let skipped = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;

            console.log('Parsed values:', values); // Debug log

            const leadData = {
                company: values[0] || '',
                contact: '',
                email: values[3] || '',  // Emails column
                industry: values[5] || '',  // Services column
                state: values[1] || '',  // State column
                website: values[2] || '',  // Website column
                phone: values[4] || '',  // Phones column
                comments: values[6] || '',  // Notes column
                notes: `Imported from: ${filename}`,
                dateAdded: new Date().toISOString()
            };

            console.log('Lead data:', leadData); // Debug log

            if (leadData.company) {
                try {
                    await this.addLead(leadData);
                    imported++;
                } catch (error) {
                    skipped++;
                }
            }
        }

        // For single file imports, show immediate feedback
        if (filename !== 'CSV') {
            this.showMessage(`Imported ${imported} leads from ${filename}, skipped ${skipped} duplicates`, 'success');
            await this.updateAllViews();
        }

        return { imported, skipped };
    }

    async exportCSV() {
        try {
            const leads = await this.getAllLeads();
            const headers = ['Company', 'Website', 'Last Called', 'State', 'Industry', 'Phone', 'Contact', 'Email', 'Comments', 'Notes'];
            
            let csv = headers.join(',') + '\n';
            leads.forEach(lead => {
                const row = [
                    lead.company,
                    lead.website || '',
                    lead.lastCalled || '',
                    lead.state || '',
                    lead.industry || '',
                    lead.phone || '',
                    lead.contact || '',
                    lead.email || '',
                    lead.comments || '',
                    lead.notes || ''
                ];
                csv += row.map(field => `"${field}"`).join(',') + '\n';
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            this.showMessage('CSV exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            this.showMessage('Error exporting CSV', 'error');
        }
    }

    // Utility Functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    showMessage(message, type = 'info') {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        // Add to page
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // Storage helpers
    async saveToStorage(key, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readwrite');
            const store = transaction.objectStore('config');
            const request = store.put({ key, data });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getFromStorage(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readonly');
            const store = transaction.objectStore('config');
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.data : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Call outcome tracking
    async markCallOutcome(leadId, outcome) {
        this.currentLeadId = leadId;
        this.showCallNotesModal(outcome);
    }

    async markLeadCalled(leadId) {
        this.currentLeadId = leadId;
        this.showCallNotesModal();
    }

    // Pagination Functions
    updatePagination(totalItems) {
        this.pagination.totalItems = totalItems;
        this.pagination.totalPages = Math.ceil(totalItems / this.pagination.pageSize);
        
        // Ensure current page is valid
        if (this.pagination.currentPage > this.pagination.totalPages && this.pagination.totalPages > 0) {
            this.pagination.currentPage = this.pagination.totalPages;
        }
        if (this.pagination.currentPage < 1) {
            this.pagination.currentPage = 1;
        }
    }

    getPaginatedLeads(leads) {
        const startIndex = (this.pagination.currentPage - 1) * this.pagination.pageSize;
        const endIndex = startIndex + this.pagination.pageSize;
        return leads.slice(startIndex, endIndex);
    }

    updatePaginationControls() {
        const { currentPage, totalPages, totalItems, pageSize } = this.pagination;
        
        // Update pagination info
        const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalItems);
        document.getElementById('paginationInfo').textContent = 
            `Showing ${startItem}-${endItem} of ${totalItems} leads`;

        // Update button states
        document.getElementById('firstPageBtn').disabled = currentPage === 1;
        document.getElementById('prevPageBtn').disabled = currentPage === 1;
        document.getElementById('nextPageBtn').disabled = currentPage === totalPages || totalPages === 0;
        document.getElementById('lastPageBtn').disabled = currentPage === totalPages || totalPages === 0;

        // Update page numbers
        this.renderPageNumbers();
    }

    renderPageNumbers() {
        const { currentPage, totalPages } = this.pagination;
        const pageNumbersContainer = document.getElementById('pageNumbers');
        pageNumbersContainer.innerHTML = '';

        if (totalPages === 0) return;

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Add first page and ellipsis if needed
        if (startPage > 1) {
            this.addPageNumber(1);
            if (startPage > 2) {
                pageNumbersContainer.innerHTML += '<span class="page-ellipsis">...</span>';
            }
        }

        // Add visible page numbers
        for (let i = startPage; i <= endPage; i++) {
            this.addPageNumber(i);
        }

        // Add ellipsis and last page if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageNumbersContainer.innerHTML += '<span class="page-ellipsis">...</span>';
            }
            this.addPageNumber(totalPages);
        }
    }

    addPageNumber(pageNumber) {
        const pageNumbersContainer = document.getElementById('pageNumbers');
        const pageElement = document.createElement('span');
        pageElement.className = `page-number ${pageNumber === this.pagination.currentPage ? 'active' : ''}`;
        pageElement.textContent = pageNumber;
        pageNumbersContainer.appendChild(pageElement);
    }

    goToPage(pageNumber) {
        if (pageNumber >= 1 && pageNumber <= this.pagination.totalPages) {
            this.pagination.currentPage = pageNumber;
            this.updateLeadsView();
        }
    }

    changePageSize(newPageSize) {
        this.pagination.pageSize = newPageSize;
        this.pagination.currentPage = 1; // Reset to first page
        this.updateLeadsView();
    }

    // Format multiple phone numbers
    formatPhoneNumbers(phoneString) {
        if (!phoneString || phoneString === '-') return '-';
        
        // Clean up the phone string - remove line breaks and normalize spaces
        const cleanPhoneString = phoneString.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Split by | or look for complete phone numbers
        let phones = [];
        
        if (cleanPhoneString.includes('|')) {
            // Split by pipe
            phones = cleanPhoneString.split('|').map(p => p.trim()).filter(p => p);
        } else {
            // Try to extract phone numbers from the string
            const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
            const matches = cleanPhoneString.match(phoneRegex);
            if (matches && matches.length > 0) {
                phones = matches;
            } else {
                // Fallback to splitting by spaces if no clear phone pattern
                phones = cleanPhoneString.split(/\s+/).filter(phone => phone.trim() && phone.match(/\d/));
            }
        }
        
        if (phones.length === 0) return '-';
        
        if (phones.length === 1) {
            const formattedPhone = this.formatPhoneNumber(phones[0].trim());
            return `<span class="phone-number copy-phone-link" data-phone="${phones[0].trim()}" title="Click to copy">${formattedPhone}</span>`;
        }
        
        return phones.map(phone => {
            const formattedPhone = this.formatPhoneNumber(phone.trim());
            return `<span class="phone-number copy-phone-link" data-phone="${phone.trim()}" title="Click to copy">${formattedPhone}</span>`;
        }).join('<br>');
    }

    // Format individual phone number
    formatPhoneNumber(phone) {
        if (!phone) return phone;
        
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        
        // Handle different lengths
        if (digits.length === 10) {
            // Format as (xxx) xxx-xxxx
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        } else if (digits.length === 11 && digits[0] === '1') {
            // Format as +1 (xxx) xxx-xxxx
            return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        } else if (digits.length === 7) {
            // Format as xxx-xxxx
            return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        } else {
            // Return original if we can't format it
            return phone;
        }
    }

    // Format multiple email addresses
    formatEmailAddresses(emailString) {
        if (!emailString || emailString === '-') return '-';
        
        // Split by | or multiple spaces
        const emails = emailString.split(/[\|\s]+/).filter(email => email.trim());
        
        if (emails.length === 1) {
            return `<a href="mailto:${emails[0].trim()}" class="email-link" title="Send email">${emails[0].trim()}</a>`;
        }
        
        return emails.map(email => 
            `<a href="mailto:${email.trim()}" class="email-link" title="Send email">${email.trim()}</a>`
        ).join('<br>');
    }

    // Column Resizing Functions
    setupColumnResizing() {
        // Use event delegation for all tables
        document.addEventListener('mousedown', (e) => {
            if (e.target.closest('.leads-table th, .queue-table th, .email-table th')) {
                const th = e.target.closest('th');
                const rect = th.getBoundingClientRect();
                const isResizeHandle = e.clientX > rect.right - 10;
                
                if (isResizeHandle && !th.classList.contains('resizing')) {
                    e.preventDefault();
                    this.startColumnResize(th, e.clientX);
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.columnResizing.isResizing) {
                e.preventDefault();
                this.updateColumnResize(e.clientX);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.columnResizing.isResizing) {
                this.endColumnResize();
            }
        });

        // Prevent text selection during resize
        document.addEventListener('selectstart', (e) => {
            if (this.columnResizing.isResizing) {
                e.preventDefault();
            }
        });
    }

    startColumnResize(th, startX) {
        this.columnResizing.isResizing = true;
        this.columnResizing.startX = startX;
        this.columnResizing.startWidth = th.offsetWidth;
        this.columnResizing.currentColumn = th;
        
        th.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    updateColumnResize(currentX) {
        if (!this.columnResizing.currentColumn) return;
        
        const deltaX = currentX - this.columnResizing.startX;
        const newWidth = Math.max(50, this.columnResizing.startWidth + deltaX);
        
        this.columnResizing.currentColumn.style.width = newWidth + 'px';
        
        // Update all cells in this column
        const columnIndex = Array.from(this.columnResizing.currentColumn.parentNode.children).indexOf(this.columnResizing.currentColumn);
        const table = this.columnResizing.currentColumn.closest('table');
        
        if (table) {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cell = row.children[columnIndex];
                if (cell) {
                    cell.style.width = newWidth + 'px';
                }
            });
        }
    }

    endColumnResize() {
        if (this.columnResizing.currentColumn) {
            this.columnResizing.currentColumn.classList.remove('resizing');
        }
        
        this.columnResizing.isResizing = false;
        this.columnResizing.currentColumn = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    // Call Log Pagination Functions
    updateCallLogPagination(totalItems) {
        // Validate input
        if (typeof totalItems !== 'number' || totalItems < 0) {
            console.error('Invalid totalItems for pagination:', totalItems);
            totalItems = 0;
        }
        
        this.callLogPagination.totalItems = totalItems;
        this.callLogPagination.totalPages = Math.ceil(totalItems / this.callLogPagination.pageSize);
        
        // Ensure current page is valid
        if (this.callLogPagination.currentPage > this.callLogPagination.totalPages) {
            this.callLogPagination.currentPage = Math.max(1, this.callLogPagination.totalPages);
        }
        
        // Update pagination info display
        const startItem = totalItems === 0 ? 0 : (this.callLogPagination.currentPage - 1) * this.callLogPagination.pageSize + 1;
        const endItem = Math.min(this.callLogPagination.currentPage * this.callLogPagination.pageSize, totalItems);
        
        const paginationInfo = document.getElementById('callLogPaginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems} calls`;
        }
    }

    getPaginatedCallLogLeads(leads) {
        const startIndex = (this.callLogPagination.currentPage - 1) * this.callLogPagination.pageSize;
        const endIndex = startIndex + this.callLogPagination.pageSize;
        return leads.slice(startIndex, endIndex);
    }

    updateCallLogPaginationControls() {
        const firstBtn = document.getElementById('callLogFirstPageBtn');
        const prevBtn = document.getElementById('callLogPrevPageBtn');
        const nextBtn = document.getElementById('callLogNextPageBtn');
        const lastBtn = document.getElementById('callLogLastPageBtn');
        
        // Check if all required elements exist
        if (!firstBtn || !prevBtn || !nextBtn || !lastBtn) {
            console.error('One or more pagination control buttons not found');
            return;
        }
        
        // Update button states
        const isFirstPage = this.callLogPagination.currentPage === 1;
        const isLastPage = this.callLogPagination.currentPage === this.callLogPagination.totalPages;
        
        firstBtn.disabled = isFirstPage;
        prevBtn.disabled = isFirstPage;
        nextBtn.disabled = isLastPage || this.callLogPagination.totalPages === 0;
        lastBtn.disabled = isLastPage || this.callLogPagination.totalPages === 0;
        
        // Render page numbers
        this.renderCallLogPageNumbers();
    }

    renderCallLogPageNumbers() {
        const container = document.getElementById('callLogPageNumbers');
        container.innerHTML = '';
        
        const currentPage = this.callLogPagination.currentPage;
        const totalPages = this.callLogPagination.totalPages;
        
        if (totalPages <= 1) return;
        
        // Always show first page
        this.addCallLogPageNumber(1, currentPage === 1);
        
        // Show ellipsis if needed
        if (currentPage > 3) {
            this.addCallLogPageEllipsis();
        }
        
        // Show pages around current page
        const startPage = Math.max(2, currentPage - 1);
        const endPage = Math.min(totalPages - 1, currentPage + 1);
        
        for (let i = startPage; i <= endPage; i++) {
            if (i !== 1 && i !== totalPages) {
                this.addCallLogPageNumber(i, currentPage === i);
            }
        }
        
        // Show ellipsis if needed
        if (currentPage < totalPages - 2) {
            this.addCallLogPageEllipsis();
        }
        
        // Always show last page
        if (totalPages > 1) {
            this.addCallLogPageNumber(totalPages, currentPage === totalPages);
        }
    }

    addCallLogPageNumber(pageNumber, isActive) {
        const container = document.getElementById('callLogPageNumbers');
        const button = document.createElement('button');
        button.className = `btn btn-sm btn-secondary page-number ${isActive ? 'active' : ''}`;
        button.textContent = pageNumber;
        button.disabled = isActive;
        container.appendChild(button);
    }

    addCallLogPageEllipsis() {
        const container = document.getElementById('callLogPageNumbers');
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        container.appendChild(ellipsis);
    }

    goToCallLogPage(pageNumber) {
        if (pageNumber >= 1 && pageNumber <= this.callLogPagination.totalPages) {
            this.callLogPagination.currentPage = pageNumber;
            this.updateCallQueue();
        }
    }

    changeCallLogPageSize(newPageSize) {
        this.callLogPagination.pageSize = newPageSize;
        this.callLogPagination.currentPage = 1; // Reset to first page
        this.updateCallQueue();
    }

    // Dashboard Functions
    setupDashboard() {
        // Initialize time zones
        this.updateTimeZones();
        setInterval(() => this.updateTimeZones(), 1000);

        // Setup notepad
        this.setupNotepad();

        // Update dashboard data
        this.updateDashboard();
    }

    updateTimeZones() {
        const now = new Date();
        
        // Eastern Time (EST/EDT)
        const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        document.getElementById('easternTimeDisplay').textContent = easternTime.toLocaleTimeString();
        
        // Central Time (CST/CDT)
        const centralTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
        document.getElementById('centralTimeDisplay').textContent = centralTime.toLocaleTimeString();
        
        // Mountain Time (MST/MDT)
        const mountainTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Denver"}));
        document.getElementById('mountainTimeDisplay').textContent = mountainTime.toLocaleTimeString();
        
        // Pacific Time (PST/PDT)
        const pacificTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
        document.getElementById('pacificTimeDisplay').textContent = pacificTime.toLocaleTimeString();
    }

    setupNotepad() {
        const notepad = document.getElementById('salesNotepad');
        const saveBtn = document.getElementById('saveNotepadBtn');
        const clearBtn = document.getElementById('clearNotepadBtn');
        const status = document.getElementById('notepadStatus');

        // Load saved notepad content after a short delay to ensure DB is ready
        setTimeout(() => {
            this.loadNotepad();
        }, 100);

        // Auto-save functionality
        let saveTimeout;
        notepad.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            status.textContent = 'Saving...';
            
            saveTimeout = setTimeout(() => {
                this.saveNotepad();
                status.textContent = 'Auto-saved';
            }, 1000);
        });

        // Manual save
        saveBtn.addEventListener('click', () => {
            this.saveNotepad();
            status.textContent = 'Saved';
            setTimeout(() => {
                status.textContent = 'Auto-saved';
            }, 2000);
        });

        // Clear notepad
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the notepad?')) {
                notepad.value = '';
                this.saveNotepad();
                status.textContent = 'Cleared';
                setTimeout(() => {
                    status.textContent = 'Auto-saved';
                }, 2000);
            }
        });
    }

    async loadNotepad() {
        try {
            if (!this.db) {
                console.log('Database not ready, skipping notepad load');
                return;
            }
            
            console.log('Loading notepad, available stores:', this.db.objectStoreNames);
            const transaction = this.db.transaction(['notepad'], 'readonly');
            const store = transaction.objectStore('notepad');
            const request = store.get('sales');
            
            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    document.getElementById('salesNotepad').value = result.content || '';
                }
            };
            
            request.onerror = () => {
                console.error('Error loading notepad:', request.error);
            };
        } catch (error) {
            console.error('Error loading notepad:', error);
        }
    }

    async saveNotepad() {
        try {
            if (!this.db) {
                console.log('Database not ready, skipping notepad save');
                return;
            }
            
            const content = document.getElementById('salesNotepad').value;
            const transaction = this.db.transaction(['notepad'], 'readwrite');
            const store = transaction.objectStore('notepad');
            const request = store.put({
                id: 'sales',
                content: content,
                lastUpdated: new Date().toISOString()
            });
            
            request.onsuccess = () => {
                console.log('Notepad saved successfully');
            };
            
            request.onerror = () => {
                console.error('Error saving notepad:', request.error);
            };
        } catch (error) {
            console.error('Error saving notepad:', error);
        }
    }

    async updateDashboard() {
        try {
            const leads = await this.getAllLeads();
            
            if (!leads || !Array.isArray(leads)) {
                console.error('getAllLeads returned invalid data:', leads);
                leads = [];
            }
            
            const queueLeads = await this.getQueueLeads(leads);
            
            // Update lead metrics
            this.updateLeadMetrics(leads, queueLeads);
            
            // Update mini queue
            this.updateMiniQueue(queueLeads);
            
            // Update call analytics
            await this.updateCallAnalytics(leads);
            
            // Update geographic and industry stats
            this.updateGeographicStats(leads);
            this.updateIndustryStats(leads);
            
            // Update recent activity
            this.updateRecentActivity(leads);
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    updateLeadMetrics(leads, queueLeads) {
        const totalLeads = leads.length;
        
        // Calculate meetings set
        const meetingsSet = leads.filter(lead => lead.callOutcome === 'meeting_set').length;
        
        // Calculate new leads this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newLeadsWeek = leads.filter(lead => 
            lead.dateAdded && new Date(lead.dateAdded) > oneWeekAgo
        ).length;
        
        // Calculate never called
        const neverCalled = leads.filter(lead => !lead.lastCalled).length;
        
        // Calculate called today
        const today = new Date().toDateString();
        const calledToday = leads.filter(lead => 
            lead.lastCalled && new Date(lead.lastCalled).toDateString() === today
        ).length;
        
        // Update display
        const totalLeadsEl = document.getElementById('totalLeads');
        const newLeadsWeekEl = document.getElementById('newLeadsWeek');
        const neverCalledEl = document.getElementById('neverCalled');
        const leadsInQueueEl = document.getElementById('leadsInQueue');
        const calledTodayEl = document.getElementById('calledToday');
        const queueCountEl = document.getElementById('queueCount');
        
        if (totalLeadsEl) totalLeadsEl.textContent = totalLeads;
        if (newLeadsWeekEl) newLeadsWeekEl.textContent = newLeadsWeek;
        if (neverCalledEl) neverCalledEl.textContent = neverCalled;
        if (leadsInQueueEl) leadsInQueueEl.textContent = meetingsSet;
        if (calledTodayEl) calledTodayEl.textContent = calledToday;
        if (queueCountEl) queueCountEl.textContent = meetingsSet;
    }

    async updateCallAnalytics(leads) {
        // Get all leads with call outcomes
        const calledLeads = leads.filter(lead => lead.lastCalled);
        const totalCalls = calledLeads.length;
        
        // Count call outcomes
        const answeredCalls = calledLeads.filter(lead => lead.callOutcome === 'meeting_set').length;
        const receptionistCalls = calledLeads.filter(lead => lead.callOutcome === 'receptionist').length;
        const notInterestedCalls = calledLeads.filter(lead => lead.callOutcome === 'not_interested').length;
        
        // Calculate answer rate (answered + receptionist)
        const answerRate = totalCalls > 0 ? Math.round(((answeredCalls + receptionistCalls) / totalCalls) * 100) : 0;
        
        // Calculate meetings set rate
        const meetingsSetRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
        
        // Calculate calls today
        const today = new Date().toDateString();
        const callsToday = calledLeads.filter(lead => 
            lead.lastCalled && new Date(lead.lastCalled).toDateString() === today
        ).length;
        
        // Update display
        const totalCallsEl = document.getElementById('totalCalls');
        const answeredCallsEl = document.getElementById('answeredCalls');
        const receptionistCallsEl = document.getElementById('receptionistCalls');
        const notInterestedCallsEl = document.getElementById('notInterestedCalls');
        const answerRateEl = document.getElementById('answerRate');
        const meetingsSetRateEl = document.getElementById('meetingsSetRate');
        const callsTodayEl = document.getElementById('callsToday');
        
        
        if (totalCallsEl) totalCallsEl.textContent = totalCalls;
        if (answeredCallsEl) answeredCallsEl.textContent = answeredCalls;
        if (receptionistCallsEl) receptionistCallsEl.textContent = receptionistCalls;
        if (notInterestedCallsEl) notInterestedCallsEl.textContent = notInterestedCalls;
        if (answerRateEl) answerRateEl.textContent = answerRate + '%';
        if (meetingsSetRateEl) meetingsSetRateEl.textContent = meetingsSetRate + '%';
        if (callsTodayEl) callsTodayEl.textContent = callsToday;
        
        // Update call trends chart
        this.updateCallTrendsChart(calledLeads);
    }

    updateCallTrendsChart(calledLeads) {
        const canvas = document.getElementById('callTrendCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const chartWidth = canvas.width;
        const chartHeight = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, chartWidth, chartHeight);
        
        // Get last 7 days data
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            const callsOnDate = calledLeads.filter(lead => 
                lead.lastCalled && new Date(lead.lastCalled).toDateString() === dateStr
            ).length;
            
            last7Days.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                calls: callsOnDate
            });
        }
        
        // Find max calls for scaling
        const maxCalls = Math.max(...last7Days.map(d => d.calls), 1);
        
        // Draw chart
        const padding = 40;
        const chartAreaWidth = chartWidth - (padding * 2);
        const chartAreaHeight = chartHeight - (padding * 2);
        
        // Draw axes
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, chartHeight - padding);
        ctx.lineTo(chartWidth - padding, chartHeight - padding);
        ctx.stroke();
        
        // Draw bars
        const barWidth = chartAreaWidth / last7Days.length;
        last7Days.forEach((day, index) => {
            const barHeight = (day.calls / maxCalls) * chartAreaHeight;
            const x = padding + (index * barWidth) + (barWidth * 0.1);
            const y = chartHeight - padding - barHeight;
            const width = barWidth * 0.8;
            
            // Draw bar
            ctx.fillStyle = '#3498db';
            ctx.fillRect(x, y, width, barHeight);
            
            // Draw value
            ctx.fillStyle = '#2c3e50';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(day.calls.toString(), x + width/2, y - 5);
            
            // Draw date label
            ctx.fillText(day.date, x + width/2, chartHeight - padding + 15);
        });
    }

    updateGeographicStats(leads) {
        const geoStats = document.getElementById('geoStats');
        if (!geoStats) return;
        
        // Count leads by state
        const stateCounts = {};
        leads.forEach(lead => {
            if (lead.state) {
                stateCounts[lead.state] = (stateCounts[lead.state] || 0) + 1;
            }
        });
        
        // Sort by count and take top 5
        const topStates = Object.entries(stateCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        geoStats.innerHTML = topStates.map(([state, count]) => `
            <div class="geo-item">
                <span class="state-name">${state}</span>
                <span class="state-count">${count}</span>
            </div>
        `).join('');
    }

    updateIndustryStats(leads) {
        const industryStats = document.getElementById('industryStats');
        if (!industryStats) return;
        
        // Count leads by industry
        const industryCounts = {};
        leads.forEach(lead => {
            if (lead.industry) {
                industryCounts[lead.industry] = (industryCounts[lead.industry] || 0) + 1;
            }
        });
        
        // Sort by count and take top 5
        const topIndustries = Object.entries(industryCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        industryStats.innerHTML = topIndustries.map(([industry, count]) => `
            <div class="industry-item">
                <span class="industry-name">${industry}</span>
                <span class="industry-count">${count}</span>
            </div>
        `).join('');
    }

    updateRecentActivity(leads) {
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) {
            return;
        }
        
        // Ensure leads is an array
        if (!Array.isArray(leads)) {
            console.error('updateRecentActivity: leads is not an array:', leads);
            recentActivity.innerHTML = '<div class="activity-item">No recent activity</div>';
            return;
        }
        
        // Get recent calls (last 10)
        const recentCalls = leads
            .filter(lead => lead && lead.lastCalled)
            .sort((a, b) => new Date(b.lastCalled) - new Date(a.lastCalled))
            .slice(0, 10);
        
        if (recentCalls.length === 0) {
            recentActivity.innerHTML = '<div class="activity-item">No recent activity</div>';
            return;
        }
        
        recentActivity.innerHTML = recentCalls.map(lead => {
            const timeAgo = this.getTimeAgo(new Date(lead.lastCalled));
            const outcomeIcon = this.getCallOutcomeIcon(lead.callOutcome);
            const outcomeClass = this.getCallOutcomeClass(lead.callOutcome);
            
            return `
                <div class="activity-item">
                    <i class="fas ${outcomeIcon} ${outcomeClass}"></i>
                    <span>Called ${lead.company}</span>
                    <small>${timeAgo}</small>
                </div>
            `;
        }).join('');
    }

    getCallOutcomeIcon(outcome) {
        switch (outcome) {
            case 'answered': return 'fa-user-check';
            case 'receptionist': return 'fa-user-tie';
            case 'not_interested': return 'fa-user-times';
            default: return 'fa-phone';
        }
    }

    getCallOutcomeClass(outcome) {
        switch (outcome) {
            case 'answered': return 'text-success';
            case 'receptionist': return 'text-info';
            case 'not_interested': return 'text-warning';
            default: return 'text-secondary';
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    // Mini Queue Functions
    updateMiniQueue(queueLeads) {
        const companyNameEl = document.getElementById('miniCompanyName');
        const stateEl = document.getElementById('miniState');
        const websiteEl = document.getElementById('miniWebsite');
        const callBtn = document.getElementById('miniCallBtn');
        
        if (queueLeads.length === 0) {
            companyNameEl.textContent = 'No leads in queue';
            stateEl.textContent = '-';
            websiteEl.href = '#';
            websiteEl.textContent = 'Visit Site';
            websiteEl.style.display = 'none';
            callBtn.disabled = true;
            return;
        }
        
        const nextLead = queueLeads[0];
        companyNameEl.textContent = nextLead.company || 'Unknown Company';
        stateEl.textContent = nextLead.state || '-';
        
        if (nextLead.website) {
            websiteEl.href = nextLead.website.startsWith('http') ? nextLead.website : `https://${nextLead.website}`;
            websiteEl.textContent = 'Visit Site';
            websiteEl.style.display = 'inline';
        } else {
            websiteEl.href = '#';
            websiteEl.textContent = 'No Website';
            websiteEl.style.display = 'none';
        }
        
        callBtn.disabled = false;
        callBtn.onclick = () => this.handleMiniCall(nextLead.id);
    }


    async handleMiniCall(leadId) {
        if (!leadId) {
            this.showMessage('No lead selected', 'error');
            return;
        }
        
        // Set the current lead and open call notes modal
        this.currentLeadId = leadId;
        this.showCallNotesModal();
    }

    // Meetings Functions
    async updateMeetingsList() {
        try {
            const leads = await this.getAllLeads();
            const meetings = leads.filter(lead => lead.meetingData).map(lead => ({
                ...lead.meetingData,
                leadId: lead.id,
                company: lead.company,
                contact: lead.contact,
                email: lead.email,
                phone: lead.phone
            }));

            this.renderMeetingsTable(meetings);
        } catch (error) {
            console.error('Error updating meetings list:', error);
        }
    }

    renderMeetingsTable(meetings) {
        const tbody = document.getElementById('meetingsTableBody');
        tbody.innerHTML = '';

        if (meetings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No meetings scheduled</td></tr>';
            return;
        }

        meetings.forEach(meeting => {
            const row = document.createElement('tr');
            const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
            const isUpcoming = meetingDateTime > new Date();
            const status = isUpcoming ? 'upcoming' : 'completed';
            
            row.innerHTML = `
                <td>${meeting.company}</td>
                <td>${meeting.contact || '-'}</td>
                <td>${new Date(meeting.date).toLocaleDateString()}</td>
                <td>${meeting.time}</td>
                <td><span class="meeting-status ${status}">${status}</span></td>
                <td>${meeting.notes || '-'}</td>
                <td>
                    ${meeting.googleCalendarLink ? `<a href="${meeting.googleCalendarLink}" target="_blank" class="google-calendar-link"><i class="fas fa-calendar-plus"></i> Calendar</a>` : '-'}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Custom Queue Management Functions
    async showQueueManagementModal() {
        document.getElementById('queueManagementModal').classList.add('show');
        // Custom queues are already loaded, just render the list
        this.renderQueueList();
        this.setupQueueModalTabs();
    }

    closeQueueManagementModal() {
        document.getElementById('queueManagementModal').classList.remove('show');
        // Reset form
        document.getElementById('newQueueName').value = '';
        document.getElementById('newQueueDescription').value = '';
        document.getElementById('selectedCount').textContent = '0 leads selected';
        document.getElementById('saveQueueModal').style.display = 'none';
        
        // Reset editing state
        this.editingQueueId = null;
        
        // Reset button text
        const saveBtn = document.getElementById('saveQueueModal');
        if (saveBtn) {
            saveBtn.textContent = 'Create Queue';
        }
        
        // Switch back to existing tab
        const existingTab = document.querySelector('[data-tab="existing"]');
        if (existingTab) {
            existingTab.click();
        }
    }

    setupQueueModalTabs() {
        const tabs = document.querySelectorAll('.queue-management-tabs .tab-btn');
        const contents = document.querySelectorAll('#queueManagementModal .tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const tabName = tab.dataset.tab;
                document.getElementById(tabName).classList.add('active');
                
                // Show/hide save button based on tab
                if (tabName === 'create') {
                    document.getElementById('saveQueueModal').style.display = 'inline-block';
                    this.loadLeadSelection();
                } else {
                    document.getElementById('saveQueueModal').style.display = 'none';
                }
            });
        });
    }

    async loadCustomQueues() {
        try {
            if (!this.db) {
                console.error('Database not initialized');
                this.customQueues = [];
                this.updateQueueSelector();
                return;
            }

            const transaction = this.db.transaction(['customQueues'], 'readonly');
            const store = transaction.objectStore('customQueues');
            const request = store.getAll();
            
            request.onsuccess = () => {
                this.customQueues = request.result || [];
                this.updateQueueSelector();
                // Only render queue list if we're in the management modal
                if (document.getElementById('queueManagementModal')?.classList.contains('show')) {
                this.renderQueueList();
                }
            };
            
            request.onerror = () => {
                console.error('Error loading custom queues:', request.error);
                this.customQueues = [];
                this.updateQueueSelector();
            };
        } catch (error) {
            console.error('Error loading custom queues:', error);
            this.customQueues = [];
            this.updateQueueSelector();
        }
    }

    renderQueueList() {
        const queueList = document.getElementById('queueList');
        if (!queueList) {
            console.error('Queue list element not found');
            return;
        }
        
        queueList.innerHTML = '';

        if (!Array.isArray(this.customQueues) || this.customQueues.length === 0) {
            queueList.innerHTML = '<p class="text-center">No custom queues created yet.</p>';
            return;
        }

        this.customQueues.forEach(queue => {
            if (!queue || !queue.id || !queue.name) {
                console.warn('Invalid queue data:', queue);
                return;
            }
            
            const queueItem = document.createElement('div');
            queueItem.className = 'queue-item';
            queueItem.innerHTML = `
                <div class="queue-info">
                    <h4>${queue.name}</h4>
                    <p>${queue.description || 'No description'} • ${Array.isArray(queue.leadIds) ? queue.leadIds.length : 0} leads</p>
                </div>
                <div class="queue-actions">
                    <button class="btn btn-sm btn-secondary queue-edit-btn" data-queue-id="${queue.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger queue-delete-btn" data-queue-id="${queue.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            queueList.appendChild(queueItem);
        });
        
        // Set up event listeners for the queue action buttons
        this.setupQueueActionListeners();
    }

    setupQueueActionListeners() {
        // Use event delegation to handle queue action buttons
        const queueList = document.getElementById('queueList');
        if (!queueList) return;

        // Remove existing listeners to prevent duplicates
        queueList.removeEventListener('click', this.handleQueueAction);

        // Add new listener
        queueList.addEventListener('click', this.handleQueueAction.bind(this));
    }

    handleQueueAction(event) {
        const target = event.target.closest('button');
        if (!target) return;

        const queueId = target.dataset.queueId;
        if (!queueId) return;

        if (target.classList.contains('queue-edit-btn')) {
            this.editCustomQueue(queueId);
        } else if (target.classList.contains('queue-delete-btn')) {
            this.deleteCustomQueue(queueId);
        }
    }

    updateQueueSelector() {
        const selector = document.getElementById('queueSelector');
        if (!selector) {
            console.error('Queue selector element not found');
            return;
        }
        
        // Store current selection
        const currentValue = selector.value;
        
        // Clear and rebuild options
        selector.innerHTML = '<option value="default">Default Queue</option>';
        
        if (Array.isArray(this.customQueues)) {
        this.customQueues.forEach(queue => {
            const option = document.createElement('option');
            option.value = queue.id;
            option.textContent = queue.name;
            selector.appendChild(option);
        });
    }

        // Restore selection if it still exists
        if (currentValue && Array.from(selector.options).some(option => option.value === currentValue)) {
            selector.value = currentValue;
        }
    }

    loadLeadSelection() {
        // Initialize pagination and filters
        this.setupLeadSelectionPagination();
        this.setupLeadSelectionFilters();
        
        // Use existing leads data or show empty state
        this.filteredLeads = this.allLeads ? [...this.allLeads] : [];
        this.renderLeadSelectionTable(this.filteredLeads);
    }

    renderLeadSelectionTable(leads) {
        const tbody = document.getElementById('selectionTableBody');
        if (!tbody) return;
        
        // Clear table
        tbody.innerHTML = '';

        // Handle empty state
        if (!leads || leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No leads found</td></tr>';
            this.updateLeadSelectionPagination(0);
            return;
        }

        // Get paginated leads and render
        const paginatedLeads = this.getPaginatedLeadSelection(leads);
        const fragment = document.createDocumentFragment();
        
        paginatedLeads.forEach(lead => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="lead-checkbox" data-lead-id="${lead.id}"></td>
                <td>${lead.company}</td>
                <td>${lead.contact || '-'}</td>
                <td>${lead.state || '-'}</td>
                <td>${lead.industry || '-'}</td>
                <td>${this.formatPhoneNumbers(lead.phone)}</td>
            `;
            fragment.appendChild(row);
        });

        tbody.appendChild(fragment);
        this.setupLeadSelectionEvents();
        this.updateLeadSelectionPagination(leads.length);
    }

    setupLeadSelectionEvents() {
        // Remove existing listeners to prevent duplicates
        const selectAllCheckbox = document.getElementById('selectAllLeads');
        if (selectAllCheckbox) {
            selectAllCheckbox.removeEventListener('change', this.handleSelectAllLeads);
            selectAllCheckbox.addEventListener('change', this.handleSelectAllLeads.bind(this));
        }

        // Use event delegation for individual checkboxes
        const tbody = document.getElementById('selectionTableBody');
        if (tbody) {
            tbody.removeEventListener('change', this.handleLeadCheckboxChange);
            tbody.addEventListener('change', this.handleLeadCheckboxChange.bind(this));
        }
    }

    handleSelectAllLeads(e) {
            const checkboxes = document.querySelectorAll('.lead-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            this.updateSelectedCount();
    }

    handleLeadCheckboxChange(e) {
        if (e.target.classList.contains('lead-checkbox')) {
            this.updateSelectedCount();
            this.updateSelectAllCheckbox();
        }
    }

    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllLeads');
        if (!selectAllCheckbox) return;
        
        const allCheckboxes = document.querySelectorAll('.lead-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.lead-checkbox:checked');
        
        if (allCheckboxes.length === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (checkedCheckboxes.length === allCheckboxes.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else if (checkedCheckboxes.length > 0) {
            selectAllCheckbox.indeterminate = true;
            selectAllCheckbox.checked = false;
        } else {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        }
    }

    updateSelectedCount() {
        const selected = document.querySelectorAll('.lead-checkbox:checked').length;
        document.getElementById('selectedCount').textContent = `${selected} leads selected`;
    }

    setupLeadSelectionFilters() {
        // Set up state and industry filter options
        this.populateLeadSelectionFilters();
        
        // Add event listeners for filtering
        const stateFilter = document.getElementById('selectionStateFilter');
        const industryFilter = document.getElementById('selectionIndustryFilter');
        const searchInput = document.getElementById('selectionSearchInput');
        
        if (stateFilter) {
            stateFilter.addEventListener('change', () => this.filterLeadSelection());
        }
        
        if (industryFilter) {
            industryFilter.addEventListener('change', () => this.filterLeadSelection());
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterLeadSelection());
        }
    }

    populateLeadSelectionFilters() {
        if (!this.allLeads) return;
        
        // Get unique states and industries
        const states = [...new Set(this.allLeads.map(lead => lead.state).filter(Boolean))].sort();
        const industries = [...new Set(this.allLeads.map(lead => lead.industry).filter(Boolean))].sort();
        
        // Populate state filter
        const stateFilter = document.getElementById('selectionStateFilter');
        if (stateFilter) {
            const currentState = stateFilter.value;
            stateFilter.innerHTML = '<option value="all">All States</option>';
            states.forEach(state => {
                const option = document.createElement('option');
                option.value = state;
                option.textContent = state;
                stateFilter.appendChild(option);
            });
            if (states.includes(currentState)) {
                stateFilter.value = currentState;
            }
        }
        
        // Populate industry filter
        const industryFilter = document.getElementById('selectionIndustryFilter');
        if (industryFilter) {
            const currentIndustry = industryFilter.value;
            industryFilter.innerHTML = '<option value="all">All Industries</option>';
            industries.forEach(industry => {
                const option = document.createElement('option');
                option.value = industry;
                option.textContent = industry;
                industryFilter.appendChild(option);
            });
            if (industries.includes(currentIndustry)) {
                industryFilter.value = currentIndustry;
            }
        }
    }

    filterLeadSelection() {
        if (!this.allLeads) return;
        
        const stateFilter = document.getElementById('selectionStateFilter')?.value || 'all';
        const industryFilter = document.getElementById('selectionIndustryFilter')?.value || 'all';
        const searchTerm = document.getElementById('selectionSearchInput')?.value.toLowerCase() || '';
        
        this.filteredLeads = this.allLeads.filter(lead => {
            return (stateFilter === 'all' || lead.state === stateFilter) &&
                   (industryFilter === 'all' || lead.industry === industryFilter) &&
                   (!searchTerm || this.matchesSearch(lead, searchTerm));
        });
        
        // Reset pagination and render
        this.leadSelectionPagination.currentPage = 1;
        this.renderLeadSelectionTable(this.filteredLeads);
    }
    
    matchesSearch(lead, searchTerm) {
        const searchableText = [
            lead.company,
            lead.contact,
            lead.email,
            lead.state,
            lead.industry
        ].join(' ').toLowerCase();
        
        return searchableText.includes(searchTerm);
    }

    setupLeadSelectionPagination() {
        this.leadSelectionPagination = {
            currentPage: 1,
            pageSize: 25,
            totalItems: 0,
            totalPages: 0
        };
    }

    getPaginatedLeadSelection(leads) {
        if (!this.leadSelectionPagination) return leads;
        
        const { currentPage, pageSize } = this.leadSelectionPagination;
        const startIndex = (currentPage - 1) * pageSize;
        return leads.slice(startIndex, startIndex + pageSize);
    }

    updateLeadSelectionPagination(totalItems) {
        if (!this.leadSelectionPagination) return;
        
        const { pageSize } = this.leadSelectionPagination;
        this.leadSelectionPagination.totalItems = totalItems;
        this.leadSelectionPagination.totalPages = Math.ceil(totalItems / pageSize);
        
        // Ensure current page is valid
        if (this.leadSelectionPagination.currentPage > this.leadSelectionPagination.totalPages) {
            this.leadSelectionPagination.currentPage = Math.max(1, this.leadSelectionPagination.totalPages);
        }
        
        this.renderLeadSelectionPagination();
    }

    renderLeadSelectionPagination() {
        const paginationContainer = document.getElementById('leadSelectionPagination');
        
        if (!paginationContainer) return;
        
        if (!this.leadSelectionPagination) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        // Always show pagination controls, even for single page
        if (this.leadSelectionPagination.totalPages <= 1) {
            // Show minimal pagination info for single page
            const { totalItems } = this.leadSelectionPagination;
            paginationContainer.innerHTML = `
                <div class="pagination-left">
                    <span class="pagination-info" id="leadSelectionPaginationInfo">Showing all ${totalItems} leads</span>
                </div>
                <div class="pagination-center">
                    <div class="pagination-controls">
                        <!-- No navigation buttons needed for single page -->
                    </div>
                </div>
                <div class="pagination-right">
                    <div class="page-size-selector">
                        <label>Show</label>
                        <select id="leadSelectionPageSizeSelect" class="page-size-select">
                            <option value="10" ${this.leadSelectionPagination.pageSize === 10 ? 'selected' : ''}>10</option>
                            <option value="25" ${this.leadSelectionPagination.pageSize === 25 ? 'selected' : ''}>25</option>
                            <option value="50" ${this.leadSelectionPagination.pageSize === 50 ? 'selected' : ''}>50</option>
                            <option value="100" ${this.leadSelectionPagination.pageSize === 100 ? 'selected' : ''}>100</option>
                        </select>
                        <span>per page</span>
                    </div>
                </div>
            `;
            this.setupLeadSelectionPaginationEvents();
            return;
        }
        
        const { currentPage, totalPages, totalItems, pageSize } = this.leadSelectionPagination;
        const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalItems);
        
        paginationContainer.innerHTML = `
            <div class="pagination-left">
                <span class="pagination-info" id="leadSelectionPaginationInfo">Showing ${startItem}-${endItem} of ${totalItems} leads</span>
            </div>
            <div class="pagination-center">
                <div class="pagination-controls">
                    <button class="pagination-btn pagination-btn-nav" id="leadSelectionFirstPageBtn" ${currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-angle-double-left"></i>
                    </button>
                    <button class="pagination-btn pagination-btn-nav" id="leadSelectionPrevPageBtn" ${currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-angle-left"></i>
                    </button>
                    <div class="page-numbers" id="leadSelectionPageNumbers">
                        ${this.generatePageNumbers(currentPage, totalPages)}
                    </div>
                    <button class="pagination-btn pagination-btn-nav" id="leadSelectionNextPageBtn" ${currentPage === totalPages ? 'disabled' : ''}>
                        <i class="fas fa-angle-right"></i>
                    </button>
                    <button class="pagination-btn pagination-btn-nav" id="leadSelectionLastPageBtn" ${currentPage === totalPages ? 'disabled' : ''}>
                        <i class="fas fa-angle-double-right"></i>
                    </button>
                </div>
            </div>
            <div class="pagination-right">
                <div class="page-size-selector">
                    <label>Show</label>
                    <select id="leadSelectionPageSizeSelect" class="page-size-select">
                        <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
                        <option value="25" ${pageSize === 25 ? 'selected' : ''}>25</option>
                        <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
                    </select>
                    <span>per page</span>
                </div>
            </div>
        `;
        
        this.setupLeadSelectionPaginationEvents();
    }

    setupLeadSelectionPaginationEvents() {
        const buttons = {
            first: document.getElementById('leadSelectionFirstPageBtn'),
            prev: document.getElementById('leadSelectionPrevPageBtn'),
            next: document.getElementById('leadSelectionNextPageBtn'),
            last: document.getElementById('leadSelectionLastPageBtn'),
            pageSize: document.getElementById('leadSelectionPageSizeSelect'),
            pageNumbers: document.getElementById('leadSelectionPageNumbers')
        };
        
        // Navigation buttons
        if (buttons.first) buttons.first.addEventListener('click', () => this.goToLeadSelectionPage(1));
        if (buttons.prev) buttons.prev.addEventListener('click', () => this.goToLeadSelectionPage(this.leadSelectionPagination.currentPage - 1));
        if (buttons.next) buttons.next.addEventListener('click', () => this.goToLeadSelectionPage(this.leadSelectionPagination.currentPage + 1));
        if (buttons.last) buttons.last.addEventListener('click', () => this.goToLeadSelectionPage(this.leadSelectionPagination.totalPages));
        
        // Page size change
        if (buttons.pageSize) {
            buttons.pageSize.addEventListener('change', (e) => {
                this.leadSelectionPagination.pageSize = parseInt(e.target.value);
                this.leadSelectionPagination.currentPage = 1;
                this.renderLeadSelectionTable(this.filteredLeads);
            });
        }
        
        // Page number buttons
        if (buttons.pageNumbers) {
            buttons.pageNumbers.addEventListener('click', (e) => {
                if (e.target.classList.contains('page-btn')) {
                    const pageNumber = parseInt(e.target.dataset.page);
                    this.goToLeadSelectionPage(pageNumber);
                }
            });
        }
    }

    goToLeadSelectionPage(pageNumber) {
        if (!this.leadSelectionPagination) return;
        
        const { totalPages } = this.leadSelectionPagination;
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            this.leadSelectionPagination.currentPage = pageNumber;
            this.renderLeadSelectionTable(this.filteredLeads);
        }
    }

    generatePageNumbers(currentPage, totalPages) {
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        let pageNumbers = '';
        
        // First page
        if (startPage > 1) {
            pageNumbers += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                pageNumbers += `<span class="page-ellipsis">...</span>`;
            }
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage ? 'active' : '';
            pageNumbers += `<button class="page-btn ${isActive}" data-page="${i}">${i}</button>`;
        }
        
        // Last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageNumbers += `<span class="page-ellipsis">...</span>`;
            }
            pageNumbers += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        return pageNumbers;
    }

    async createCustomQueue() {
        const name = document.getElementById('newQueueName').value.trim();
        const description = document.getElementById('newQueueDescription').value.trim();
        
        if (!name) {
            this.showMessage('Please enter a queue name', 'error');
            return;
        }

        const selectedLeads = Array.from(document.querySelectorAll('.lead-checkbox:checked'))
            .map(cb => parseInt(cb.dataset.leadId));

        if (selectedLeads.length === 0) {
            this.showMessage('Please select at least one lead', 'error');
            return;
        }

        try {
            const queueData = {
                name,
                description,
                leadIds: selectedLeads,
                createdAt: new Date().toISOString()
            };

            const transaction = this.db.transaction(['customQueues'], 'readwrite');
            const store = transaction.objectStore('customQueues');
            
            let request;
            let successMessage;
            
            if (this.editingQueueId) {
                // Update existing queue
                queueData.id = parseInt(this.editingQueueId);
                request = store.put(queueData);
                successMessage = `Queue "${name}" updated successfully!`;
            } else {
                // Create new queue
                request = store.add(queueData);
                successMessage = `Queue "${name}" created successfully!`;
            }

            request.onsuccess = () => {
                this.showMessage(successMessage, 'success');
                this.closeQueueManagementModal();
                // Reload custom queues to update the selector
                this.loadCustomQueues();
                
                // Reset editing state
                this.editingQueueId = null;
            };

            request.onerror = () => {
                const action = this.editingQueueId ? 'updating' : 'creating';
                this.showMessage(`Error ${action} queue`, 'error');
            };
        } catch (error) {
            console.error('Error with custom queue operation:', error);
            const action = this.editingQueueId ? 'updating' : 'creating';
            this.showMessage(`Error ${action} queue`, 'error');
        }
    }

    async loadSelectedQueue(queueId) {
        try {
        this.currentQueue = queueId;
        await this.updateCallQueue();
            
            // Show success message only for custom queues (not default)
            if (queueId !== 'default') {
                const queue = this.customQueues.find(q => q.id == queueId);
                const queueName = queue ? queue.name : 'Custom Queue';
                this.showMessage(`${queueName} loaded!`, 'success');
            }
        } catch (error) {
            console.error('Error loading selected queue:', error);
            this.showMessage('Error loading queue', 'error');
        }
    }

    async loadCustomQueue(queueId) {
        // This function is now deprecated but kept for compatibility
        // The queue selector now handles loading automatically
        await this.loadSelectedQueue(queueId);
    }

    async deleteCustomQueue(queueId) {
        try {
            const queue = this.customQueues.find(q => q.id == queueId);
            if (!queue) {
                this.showMessage('Queue not found', 'error');
                return;
            }

            if (!confirm(`Are you sure you want to delete the queue "${queue.name}"? This action cannot be undone.`)) {
                return;
            }

            const transaction = this.db.transaction(['customQueues'], 'readwrite');
            const store = transaction.objectStore('customQueues');
            const request = store.delete(parseInt(queueId));

            request.onsuccess = () => {
                this.showMessage(`Queue "${queue.name}" deleted successfully!`, 'success');
                // Reload custom queues to update the selector
                this.loadCustomQueues();
                
                // If the deleted queue was currently active, switch to default
                if (this.currentQueue == queueId) {
                    this.currentQueue = 'default';
                    const selector = document.getElementById('queueSelector');
                    if (selector) {
                        selector.value = 'default';
                    }
                    this.updateCallQueue();
                }
            };

            request.onerror = () => {
                this.showMessage('Error deleting queue', 'error');
            };
        } catch (error) {
            console.error('Error deleting custom queue:', error);
            this.showMessage('Error deleting queue', 'error');
        }
    }

    editCustomQueue(queueId) {
        try {
            const queue = this.customQueues.find(q => q.id == queueId);
            if (!queue) {
                this.showMessage('Queue not found', 'error');
                return;
            }

            // Switch to create tab and populate with existing data
            const createTab = document.querySelector('[data-tab="create"]');
            const existingTab = document.querySelector('[data-tab="existing"]');
            
            if (createTab && existingTab) {
                createTab.click();
                
                // Populate form with existing data
                document.getElementById('newQueueName').value = queue.name;
                document.getElementById('newQueueDescription').value = queue.description || '';
                
                // Load leads and pre-select the ones in this queue
                this.loadLeadSelection();
                
                // Pre-select leads that are in this queue
                setTimeout(() => {
                    const checkboxes = document.querySelectorAll('.lead-checkbox');
                    checkboxes.forEach(checkbox => {
                        const leadId = parseInt(checkbox.dataset.leadId);
                        checkbox.checked = queue.leadIds.includes(leadId);
                    });
                    this.updateSelectedCount();
                }, 100);
                
                // Store the queue ID for updating instead of creating
                this.editingQueueId = queueId;
                
                // Change button text
                const saveBtn = document.getElementById('saveQueueModal');
                if (saveBtn) {
                    saveBtn.textContent = 'Update Queue';
                }
            }
        } catch (error) {
            console.error('Error editing custom queue:', error);
            this.showMessage('Error loading queue for editing', 'error');
        }
    }

    async switchQueue(queueId) {
        // This function now just calls loadSelectedQueue for consistency
        await this.loadSelectedQueue(queueId);
    }

    async getQueueLeads(leads) {
        // Ensure leads is an array
        if (!Array.isArray(leads)) {
            console.error('getQueueLeads received invalid leads data:', leads);
            return [];
        }
        
        try {
        if (this.currentQueue === 'default') {
                // Default queue logic - leads that haven't been called recently
            const threshold = new Date(Date.now() - this.config.callQueueDays * 24 * 60 * 60 * 1000).toISOString();
                return leads.filter(lead => {
                    // Include leads that have never been called or were called before the threshold
                    return !lead.lastCalled || lead.lastCalled < threshold;
                });
        } else {
            // Custom queue logic
            const customQueue = this.customQueues.find(q => q.id == this.currentQueue);
                if (!customQueue) {
                    console.warn(`Custom queue with ID ${this.currentQueue} not found`);
                    return [];
                }
                
                if (!Array.isArray(customQueue.leadIds)) {
                    console.warn(`Custom queue ${customQueue.name} has invalid leadIds array`);
                    return [];
                }
            
            return leads.filter(lead => customQueue.leadIds.includes(lead.id));
            }
        } catch (error) {
            console.error('Error in getQueueLeads:', error);
            return [];
        }
    }

    // Prospecting Methods
    async updateProspectingView() {
        try {
            const prospects = await this.getProspects();
            this.updateProspectingPipeline(prospects);
            this.updateProspectingTable(prospects);
            this.updateProspectingFilters(prospects);
        } catch (error) {
            console.error('Error updating prospecting view:', error);
        }
    }

    async getProspects() {
        try {
            const prospects = await this.getFromStorage('prospects') || [];
            return prospects;
        } catch (error) {
            console.error('Error getting prospects:', error);
            return [];
        }
    }

    updateProspectingPipeline(prospects) {
        const stages = {
            unreviewed: prospects.filter(p => p.stage === 'unreviewed').length,
            finalized: prospects.filter(p => p.stage === 'finalized').length,
            unqualified: prospects.filter(p => p.stage === 'unqualified').length
        };

        document.getElementById('unreviewedCount').textContent = stages.unreviewed;
        document.getElementById('finalizedCount').textContent = stages.finalized;
        document.getElementById('unqualifiedCount').textContent = stages.unqualified;
    }

    updateProspectingTable(prospects) {
        const stageFilter = document.getElementById('prospectingStageFilter').value;
        const stateFilter = document.getElementById('prospectingStateFilter').value;
        const serviceFilter = document.getElementById('prospectingServiceFilter').value;
        const searchTerm = document.getElementById('prospectingSearchInput').value.toLowerCase();

        let filteredProspects = prospects.filter(prospect => {
            const matchesStage = stageFilter === 'all' || prospect.stage === stageFilter;
            const matchesState = stateFilter === 'all' || prospect.state === stateFilter;
            const matchesService = serviceFilter === 'all' || prospect.service === serviceFilter;
            const matchesSearch = !searchTerm || 
                prospect.company.toLowerCase().includes(searchTerm) ||
                prospect.website.toLowerCase().includes(searchTerm) ||
                prospect.state.toLowerCase().includes(searchTerm) ||
                prospect.service.toLowerCase().includes(searchTerm);

            return matchesStage && matchesState && matchesService && matchesSearch;
        });

        this.prospectingPagination.totalItems = filteredProspects.length;
        this.prospectingPagination.totalPages = Math.ceil(filteredProspects.length / this.prospectingPagination.pageSize);

        const startIndex = (this.prospectingPagination.currentPage - 1) * this.prospectingPagination.pageSize;
        const endIndex = startIndex + this.prospectingPagination.pageSize;
        const paginatedProspects = filteredProspects.slice(startIndex, endIndex);

        this.renderProspectingTable(paginatedProspects);
        this.updateProspectingPagination();
    }

    renderProspectingTable(prospects) {
        const tbody = document.getElementById('prospectingTableBody');
        tbody.innerHTML = '';

        prospects.forEach(prospect => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="prospect-checkbox" data-id="${prospect.id}"></td>
                <td>${prospect.company}</td>
                <td><a href="${prospect.website}" target="_blank" class="website-link">${prospect.website}</a></td>
                <td>${prospect.state}</td>
                <td>${prospect.service}</td>
                <td>${prospect.revenue || 'N/A'}</td>
                <td>${prospect.employees || 'N/A'}</td>
                <td><span class="stage-badge ${prospect.stage}">${prospect.stage}</span></td>
                <td>
                    <button class="btn btn-sm btn-info prospect-view-btn" data-id="${prospect.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary prospect-edit-btn" data-id="${prospect.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger prospect-delete-btn" data-id="${prospect.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateProspectingFilters(prospects) {
        const states = [...new Set(prospects.map(p => p.state))].sort();
        const services = [...new Set(prospects.map(p => p.service))].sort();

        const stateFilter = document.getElementById('prospectingStateFilter');
        const serviceFilter = document.getElementById('prospectingServiceFilter');

        // Update state filter
        stateFilter.innerHTML = '<option value="all">All States</option>';
        states.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            stateFilter.appendChild(option);
        });

        // Update service filter
        serviceFilter.innerHTML = '<option value="all">All Services</option>';
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service;
            option.textContent = service;
            serviceFilter.appendChild(option);
        });
    }

    updateProspectingPagination() {
        const info = document.getElementById('prospectingPaginationInfo');
        const startItem = (this.prospectingPagination.currentPage - 1) * this.prospectingPagination.pageSize + 1;
        const endItem = Math.min(this.prospectingPagination.currentPage * this.prospectingPagination.pageSize, this.prospectingPagination.totalItems);
        
        info.textContent = `Showing ${startItem} to ${endItem} of ${this.prospectingPagination.totalItems} prospects`;

        // Update pagination buttons
        document.getElementById('prospectingFirstPageBtn').disabled = this.prospectingPagination.currentPage === 1;
        document.getElementById('prospectingPrevPageBtn').disabled = this.prospectingPagination.currentPage === 1;
        document.getElementById('prospectingNextPageBtn').disabled = this.prospectingPagination.currentPage === this.prospectingPagination.totalPages;
        document.getElementById('prospectingLastPageBtn').disabled = this.prospectingPagination.currentPage === this.prospectingPagination.totalPages;

        // Generate page numbers
        this.generateProspectingPageNumbers();
    }

    generateProspectingPageNumbers() {
        const container = document.getElementById('prospectingPageNumbers');
        container.innerHTML = '';

        const maxPages = Math.min(5, this.prospectingPagination.totalPages);
        const startPage = Math.max(1, this.prospectingPagination.currentPage - Math.floor(maxPages / 2));
        const endPage = Math.min(this.prospectingPagination.totalPages, startPage + maxPages - 1);

        for (let i = startPage; i <= endPage; i++) {
            const button = document.createElement('button');
            button.className = `btn btn-sm ${i === this.prospectingPagination.currentPage ? 'btn-primary' : 'btn-secondary'} page-number`;
            button.textContent = i;
            container.appendChild(button);
        }
    }

    goToProspectingPage(pageNumber) {
        if (pageNumber >= 1 && pageNumber <= this.prospectingPagination.totalPages) {
            this.prospectingPagination.currentPage = pageNumber;
            this.updateProspectingView();
        }
    }

    changeProspectingPageSize(newSize) {
        this.prospectingPagination.pageSize = newSize;
        this.prospectingPagination.currentPage = 1;
        this.updateProspectingView();
    }



    async importProspects() {
        document.getElementById('prospectCsvFileInput').click();
    }

    async handleProspectCSVFile(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        try {
            for (const file of files) {
                const csvData = await this.readCSVFile(file);
                const prospects = this.parseProspectCSV(csvData);
                
                const existingProspects = await this.getProspects();
                const newProspects = prospects.map(prospect => ({
                    ...prospect,
                    id: Date.now() + Math.random(),
                    stage: 'unreviewed',
                    dateAdded: new Date().toISOString()
                }));
                
                await this.saveToStorage('prospects', [...existingProspects, ...newProspects]);
            }
            
            this.updateProspectingView();
            this.showMessage(`Successfully imported ${files.length} CSV file(s)`, 'success');
            
        } catch (error) {
            console.error('Error importing prospects:', error);
            this.showMessage('Error importing prospects', 'error');
        }
        
        // Reset file input
        event.target.value = '';
    }

    async readCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    parseProspectCSV(csvData) {
        // Split by line breaks and filter out empty lines
        const lines = csvData.split(/\r?\n/).filter(line => line.trim());
        const headers = this.parseCSVLine(lines[0]);
        const prospects = [];

        console.log('CSV Headers:', headers);
        console.log('Total lines to process:', lines.length);

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = this.parseCSVLine(line);
                
                // Debug: log the first few rows
                if (i <= 5) {
                    console.log(`Row ${i}:`, values);
                    console.log(`Row ${i} length:`, values.length);
                }
                
                // Skip rows that don't have the expected number of fields
                if (values.length < 6) {
                    console.warn(`Skipping row ${i} - insufficient fields:`, values);
                    continue;
                }
                
                const prospect = {};
                headers.forEach((header, index) => {
                    const key = header.toLowerCase().replace(/\s+/g, '');
                    prospect[key] = values[index] || '';
                });
                
                // Map the CSV columns to our prospect format
                const mappedProspect = {
                    company: prospect.lead || '',
                    state: prospect.state || '',
                    website: prospect.website || '',
                    phone: prospect.phones || '',
                    industry: 'CNC Machining', // Default industry based on filename
                    source: 'CSV Import',
                    status: prospect.status || 'unreviewed',
                    reason: prospect.reason || '',
                    stage: 'unreviewed'
                };
                
                // Only add if we have a valid company name
                if (mappedProspect.company) {
                    prospects.push(mappedProspect);
                } else {
                    console.warn(`Skipping row ${i} - no company name:`, mappedProspect);
                }
            }
        }
        
        console.log(`Parsed ${prospects.length} prospects from CSV`);
        return prospects;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let fieldCount = 0;
        const expectedFields = 6; // Lead,State,Website,Phones,Status,Reason
        
        // Clean the line - remove any extra whitespace or control characters
        line = line.trim();
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
                current += char; // Keep quotes for now
            } else if (char === ',' && !inQuotes) {
                // Remove quotes and trim whitespace
                let value = current.trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                result.push(value);
                current = '';
                fieldCount++;
                
                // If we're at the last field (Reason), treat everything else as part of that field
                if (fieldCount === expectedFields - 1) {
                    // This is the last field, so take everything from here to the end
                    const remaining = line.substring(i + 1).trim();
                    if (remaining.startsWith('"') && remaining.endsWith('"')) {
                        result.push(remaining.slice(1, -1));
                    } else {
                        result.push(remaining);
                    }
                    return result;
                }
            } else {
                current += char;
            }
        }
        
        // Handle the last field if we didn't hit the early return
        let value = current.trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        result.push(value);
        
        return result;
    }

    showProspectReviewModal() {
        document.getElementById('prospectReviewModal').style.display = 'block';
        this.updateProspectReviewTable();
    }

    closeProspectReviewModal() {
        document.getElementById('prospectReviewModal').style.display = 'none';
    }

    async updateProspectReviewTable() {
        const prospects = await this.getProspects();
        const stageFilter = document.getElementById('reviewStageFilter').value;
        
        let filteredProspects = prospects;
        if (stageFilter !== 'all') {
            filteredProspects = prospects.filter(p => p.stage === stageFilter);
        }

        const tbody = document.getElementById('prospectReviewTableBody');
        tbody.innerHTML = '';

        filteredProspects.forEach(prospect => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="review-prospect-checkbox" data-id="${prospect.id}"></td>
                <td>${prospect.company}</td>
                <td><a href="${prospect.website}" target="_blank">${prospect.website}</a></td>
                <td>${prospect.state}</td>
                <td>${prospect.service}</td>
                <td>${prospect.revenue || 'N/A'}</td>
                <td>${prospect.employees || 'N/A'}</td>
                <td><span class="stage-badge ${prospect.stage}">${prospect.stage}</span></td>
                <td>
                    <button class="btn btn-sm btn-info review-prospect-view-btn" data-id="${prospect.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async viewProspect(prospectId) {
        const prospects = await this.getProspects();
        const prospect = prospects.find(p => p.id === prospectId);
        
        if (prospect) {
            // Fill the prospect details form
            document.getElementById('reviewCompany').value = prospect.company;
            document.getElementById('reviewWebsite').value = prospect.website;
            document.getElementById('reviewState').value = prospect.state;
            document.getElementById('reviewService').value = prospect.service;
            document.getElementById('reviewRevenue').value = prospect.revenue || '';
            document.getElementById('reviewEmployees').value = prospect.employees || '';
            document.getElementById('reviewContact').value = prospect.contact || '';
            document.getElementById('reviewEmail').value = prospect.email || '';
            document.getElementById('reviewPhone').value = prospect.phone || '';
            document.getElementById('reviewIndustry').value = prospect.industry || '';
            document.getElementById('reviewNotes').value = prospect.notes || '';
            document.getElementById('reviewDecision').value = prospect.decision || '';
            
            // Store current prospect ID
            this.currentProspectId = prospectId;
            
            // Switch to details tab
            this.switchModalTab('prospect-details');
        }
    }

    async saveProspectReview() {
        if (!this.currentProspectId) return;

        const prospects = await this.getProspects();
        const prospectIndex = prospects.findIndex(p => p.id === this.currentProspectId);
        
        if (prospectIndex !== -1) {
            const decision = document.getElementById('reviewDecision').value;
            
            prospects[prospectIndex].contact = document.getElementById('reviewContact').value;
            prospects[prospectIndex].email = document.getElementById('reviewEmail').value;
            prospects[prospectIndex].phone = document.getElementById('reviewPhone').value;
            prospects[prospectIndex].industry = document.getElementById('reviewIndustry').value;
            prospects[prospectIndex].notes = document.getElementById('reviewNotes').value;
            prospects[prospectIndex].decision = decision;
            
            // Update stage based on decision
            if (decision === 'approve') {
                prospects[prospectIndex].stage = 'finalized';
            } else if (decision === 'reject') {
                prospects[prospectIndex].stage = 'unqualified';
            }
            
            await this.saveToStorage('prospects', prospects);
            this.updateProspectingView();
            this.updateProspectReviewTable();
            this.showMessage('Prospect review saved', 'success');
        }
    }

    async finalizeProspects() {
        const prospects = await this.getProspects();
        const finalizedProspects = prospects.filter(p => p.stage === 'finalized');
        
        if (finalizedProspects.length === 0) {
            this.showMessage('No finalized prospects to import', 'warning');
            return;
        }

        try {
            // Convert prospects to leads
            const leads = await this.getFromStorage('leads') || [];
            const newLeads = finalizedProspects.map(prospect => ({
                company: prospect.company,
                website: prospect.website,
                state: prospect.state,
                industry: prospect.industry || prospect.service,
                contact: prospect.contact,
                email: prospect.email,
                phone: prospect.phone,
                notes: prospect.notes,
                lastCalled: null,
                callOutcome: null,
                callNotes: '',
                dateAdded: new Date().toISOString()
            }));

            await this.saveToStorage('leads', [...leads, ...newLeads]);
            
            // Remove finalized prospects from prospects list
            const remainingProspects = prospects.filter(p => p.stage !== 'finalized');
            await this.saveToStorage('prospects', remainingProspects);
            
            this.updateProspectingView();
            this.updateAllViews();
            this.showMessage(`Successfully imported ${newLeads.length} prospects to CRM`, 'success');
            
        } catch (error) {
            console.error('Error finalizing prospects:', error);
            this.showMessage('Error importing prospects to CRM', 'error');
        }
    }

    async deleteProspect(prospectId) {
        if (confirm('Are you sure you want to delete this prospect?')) {
            try {
                const prospects = await this.getProspects();
                const filteredProspects = prospects.filter(p => p.id !== prospectId);
                await this.saveToStorage('prospects', filteredProspects);
                this.updateProspectingView();
                this.showMessage('Prospect deleted', 'success');
            } catch (error) {
                console.error('Error deleting prospect:', error);
                this.showMessage('Error deleting prospect', 'error');
            }
        }
    }

    filterProspectsByStage(stage) {
        // Set the stage filter and update the view
        document.getElementById('prospectingStageFilter').value = stage;
        this.updateProspectingView();
    }

    reviewProspectsByStage(stage) {
        // Set the stage filter and open review modal
        document.getElementById('prospectingStageFilter').value = stage;
        document.getElementById('reviewStageFilter').value = stage;
        this.showProspectReviewModal();
    }

    switchModalTab(tabName) {
        // Update modal tab buttons
        document.querySelectorAll('#prospectReviewModal .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`#prospectReviewModal [data-tab="${tabName}"]`).classList.add('active');

        // Update modal tab content
        document.querySelectorAll('#prospectReviewModal .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    switchQueueModalTab(tabName) {
        // Update queue modal tab buttons
        document.querySelectorAll('#queueManagementModal .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`#queueManagementModal [data-tab="${tabName}"]`).classList.add('active');

        // Update queue modal tab content
        document.querySelectorAll('#queueManagementModal .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    // Additional prospecting functions
    async editProspect(prospectId) {
        // Open the prospect review modal and switch to details tab for editing
        await this.viewProspect(prospectId);
        this.showProspectReviewModal();
    }

    async viewProspectDetails(prospectId) {
        // Same as viewProspect but specifically for the review modal
        await this.viewProspect(prospectId);
        // Ensure the review modal is open
        this.showProspectReviewModal();
    }

    toggleAllProspects(checked) {
        // Toggle all prospect checkboxes in the main table
        document.querySelectorAll('.prospect-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
        });
    }

    toggleAllReviewProspects(checked) {
        // Toggle all prospect checkboxes in the review modal
        document.querySelectorAll('.review-prospect-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
        });
    }

    async bulkApproveProspects() {
        // Get all selected prospects in the review modal
        const selectedCheckboxes = document.querySelectorAll('.review-prospect-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            this.showMessage('Please select prospects to finalize', 'warning');
            return;
        }

        try {
            const prospects = await this.getProspects();
            const selectedIds = Array.from(selectedCheckboxes).map(cb => parseFloat(cb.dataset.id));
            
            // Update selected prospects to finalized
            prospects.forEach(prospect => {
                if (selectedIds.includes(prospect.id)) {
                    prospect.stage = 'finalized';
                    prospect.decision = 'approve';
                }
            });

            await this.saveToStorage('prospects', prospects);
            this.updateProspectingView();
            this.updateProspectReviewTable();
            this.showMessage(`Successfully finalized ${selectedIds.length} prospects`, 'success');
        } catch (error) {
            console.error('Error bulk approving prospects:', error);
            this.showMessage('Error finalizing prospects', 'error');
        }
    }

    async bulkRejectProspects() {
        // Get all selected prospects in the review modal
        const selectedCheckboxes = document.querySelectorAll('.review-prospect-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            this.showMessage('Please select prospects to reject', 'warning');
            return;
        }

        try {
            const prospects = await this.getProspects();
            const selectedIds = Array.from(selectedCheckboxes).map(cb => parseFloat(cb.dataset.id));
            
            // Update selected prospects to unqualified
            prospects.forEach(prospect => {
                if (selectedIds.includes(prospect.id)) {
                    prospect.stage = 'unqualified';
                    prospect.decision = 'reject';
                }
            });

            await this.saveToStorage('prospects', prospects);
            this.updateProspectingView();
            this.updateProspectReviewTable();
            this.showMessage(`Successfully rejected ${selectedIds.length} prospects`, 'success');
        } catch (error) {
            console.error('Error bulk rejecting prospects:', error);
            this.showMessage('Error rejecting prospects', 'error');
        }
    }

    async bulkDeleteProspects() {
        // Get all selected prospects in the review modal
        const selectedCheckboxes = document.querySelectorAll('.review-prospect-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            this.showMessage('Please select prospects to delete', 'warning');
            return;
        }

        const selectedCount = selectedCheckboxes.length;
        const confirmed = confirm(`Are you sure you want to delete ${selectedCount} selected prospects?\n\nThis action cannot be undone!`);

        if (confirmed) {
            try {
                const prospects = await this.getProspects();
                const selectedIds = Array.from(selectedCheckboxes).map(cb => parseFloat(cb.dataset.id));
                
                // Remove selected prospects
                const filteredProspects = prospects.filter(prospect => !selectedIds.includes(prospect.id));

                await this.saveToStorage('prospects', filteredProspects);
                this.updateProspectingView();
                this.updateProspectReviewTable();
                this.showMessage(`Successfully deleted ${selectedCount} prospects`, 'success');
            } catch (error) {
                console.error('Error bulk deleting prospects:', error);
                this.showMessage('Error deleting prospects', 'error');
            }
        }
    }

    async deleteAllProspects() {
        // Get current prospects count
        const prospects = await this.getProspects();
        const prospectCount = prospects.length;
        
        if (prospectCount === 0) {
            this.showMessage('No prospects to delete', 'info');
            return;
        }
        
        // Show confirmation dialog with count
        const confirmed = confirm(`Are you sure you want to delete ALL ${prospectCount} prospects?\n\nThis action cannot be undone!`);
        
        if (confirmed) {
            try {
                // Clear all prospects
                await this.saveToStorage('prospects', []);
                this.updateProspectingView();
                this.showMessage(`Successfully deleted all ${prospectCount} prospects`, 'success');
            } catch (error) {
                console.error('Error deleting all prospects:', error);
                this.showMessage('Error deleting all prospects', 'error');
            }
        }
    }


    // Call Mode Functionality
    initCallMode() {
        this.callModeActive = false;
        this.callModeCurrentLeadIndex = 0;
        this.callModeLeads = [];
        this.callModeNotes = '';
        this.callScripts = [];
        this.currentScript = null;
        
        this.setupCallModeEventListeners();
        this.initScriptManagement();
        this.updateCallModeStats();
    }

    setupCallModeEventListeners() {
        // Call Mode Toggle
        const callModeToggle = document.getElementById('callModeToggle');
        if (callModeToggle) {
            callModeToggle.addEventListener('click', () => this.toggleCallMode());
        }

        // Exit Call Mode
        const exitCallMode = document.getElementById('exitCallMode');
        if (exitCallMode) {
            exitCallMode.addEventListener('click', () => this.exitCallMode());
        }

        // Call Mode Actions
        const callModeCallBtn = document.getElementById('callModeCallBtn');
        if (callModeCallBtn) {
            callModeCallBtn.addEventListener('click', () => this.callModeCall());
        }

        const callModeCopyPhone = document.getElementById('callModeCopyPhone');
        if (callModeCopyPhone) {
            callModeCopyPhone.addEventListener('click', () => this.callModeCopyPhone());
        }

        const callModeVisitWebsite = document.getElementById('callModeVisitWebsite');
        if (callModeVisitWebsite) {
            callModeVisitWebsite.addEventListener('click', () => this.callModeVisitWebsite());
        }

        // Navigation
        const callModeNextLead = document.getElementById('callModeNextLead');
        if (callModeNextLead) {
            callModeNextLead.addEventListener('click', () => this.callModeNextLead());
        }

        const callModePreviousLead = document.getElementById('callModePreviousLead');
        if (callModePreviousLead) {
            callModePreviousLead.addEventListener('click', () => this.callModePreviousLead());
        }

        const callModeRandomLead = document.getElementById('callModeRandomLead');
        if (callModeRandomLead) {
            callModeRandomLead.addEventListener('click', () => this.callModeRandomLead());
        }

        // Call Completion
        const callCompleteBtn = document.getElementById('callCompleteBtn');
        if (callCompleteBtn) {
            callCompleteBtn.addEventListener('click', () => this.showCallCompletionModal());
        }

        // Notes
        const callModeNotes = document.getElementById('callModeNotes');
        if (callModeNotes) {
            callModeNotes.addEventListener('input', (e) => {
                this.callModeNotes = e.target.value;
            });
        }

        const callModeSaveNotes = document.getElementById('callModeSaveNotes');
        if (callModeSaveNotes) {
            callModeSaveNotes.addEventListener('click', () => this.callModeSaveNotes());
        }

        const callModeClearNotes = document.getElementById('callModeClearNotes');
        if (callModeClearNotes) {
            callModeClearNotes.addEventListener('click', () => this.callModeClearNotes());
        }

        // Script Management
        const scriptSelector = document.getElementById('scriptSelector');
        if (scriptSelector) {
            scriptSelector.addEventListener('change', (e) => this.selectScript(e.target.value));
        }

        const manageScriptsBtn = document.getElementById('manageScriptsBtn');
        if (manageScriptsBtn) {
            manageScriptsBtn.addEventListener('click', () => this.showScriptManagement());
        }

        const copyScriptBtn = document.getElementById('copyScriptBtn');
        if (copyScriptBtn) {
            copyScriptBtn.addEventListener('click', () => this.copyCurrentScript());
        }

        const clearScriptBtn = document.getElementById('clearScriptBtn');
        if (clearScriptBtn) {
            clearScriptBtn.addEventListener('click', () => this.clearCurrentScript());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.callModeActive) {
                this.handleCallModeKeyboard(e);
            }
        });
    }

    toggleCallMode() {
        if (this.callModeActive) {
            this.exitCallMode();
        } else {
            this.enterCallMode();
        }
    }

    async enterCallMode() {
        // Get leads for call mode
        const allLeads = await this.getAllLeads();
        this.callModeLeads = allLeads.filter(lead => 
            !lead.lastCalled || 
            new Date(lead.lastCalled) < new Date(Date.now() - this.config.callQueueDays * 24 * 60 * 60 * 1000)
        );

        if (this.callModeLeads.length === 0) {
            alert('No leads available for calling. Add some leads or check your call queue settings.');
            return;
        }

        this.callModeActive = true;
        this.callModeCurrentLeadIndex = 0;

        // Show overlay with animation
        const overlay = document.getElementById('callModeOverlay');
        if (overlay) {
            overlay.classList.add('active', 'entering');
            setTimeout(() => {
                overlay.classList.remove('entering');
            }, 600);
        }

        // Update display
        this.updateCallModeDisplay();
        this.updateCallModeStats();

        // Focus on notes for quick typing
        setTimeout(() => {
            const notesTextarea = document.getElementById('callModeNotes');
            if (notesTextarea) {
                notesTextarea.focus();
            }
        }, 800);
    }

    exitCallMode() {
        this.callModeActive = false;

        // Hide overlay with animation
        const overlay = document.getElementById('callModeOverlay');
        if (overlay) {
            overlay.classList.add('exiting');
            setTimeout(() => {
                overlay.classList.remove('active', 'exiting');
            }, 400);
        }

        // Clear notes
        this.callModeNotes = '';
        const notesTextarea = document.getElementById('callModeNotes');
        if (notesTextarea) {
            notesTextarea.value = '';
        }
    }

    async updateCallModeDisplay() {
        if (!this.callModeActive || this.callModeLeads.length === 0) return;

        const currentLead = this.callModeLeads[this.callModeCurrentLeadIndex];
        
        // Update lead info
        const companyEl = document.getElementById('callModeCompany');
        const contactEl = document.getElementById('callModeContact');
        const phoneEl = document.getElementById('callModePhone');

        if (companyEl) companyEl.textContent = currentLead.company || 'Unknown Company';
        if (contactEl) contactEl.textContent = currentLead.contact || '-';
        if (phoneEl) phoneEl.textContent = currentLead.phone || '-';

        // Update call button state
        const callBtn = document.getElementById('callModeCallBtn');
        if (callBtn) {
            callBtn.disabled = !currentLead.phone || currentLead.phone === '-';
        }

        // Update website button state
        const websiteBtn = document.getElementById('callModeVisitWebsite');
        if (websiteBtn) {
            websiteBtn.disabled = !currentLead.website || currentLead.website === '-';
        }

        // Update Lead Analytics widget with current lead info
        await this.updateLeadAnalyticsWidget(currentLead);
        
        // Update mini queue to show current lead
        this.updateMiniQueueWithCurrentLead(currentLead);
    }

    callModeCall() {
        const currentLead = this.callModeLeads[this.callModeCurrentLeadIndex];
        if (currentLead && currentLead.phone && currentLead.phone !== '-') {
            // Copy phone to clipboard
            navigator.clipboard.writeText(currentLead.phone).then(() => {
                // Show call notes modal
                this.showCallNotesModal();
            }).catch(() => {
                // Fallback for older browsers
                this.copyPhone(currentLead.phone);
                this.showCallNotesModal();
            });
        }
    }

    callModeCopyPhone() {
        const currentLead = this.callModeLeads[this.callModeCurrentLeadIndex];
        if (currentLead && currentLead.phone && currentLead.phone !== '-') {
            this.copyPhone(currentLead.phone);
        }
    }

    callModeVisitWebsite() {
        const currentLead = this.callModeLeads[this.callModeCurrentLeadIndex];
        if (currentLead && currentLead.website && currentLead.website !== '-') {
            window.open(currentLead.website, '_blank');
        }
    }

    callModeNextLead() {
        if (this.callModeCurrentLeadIndex < this.callModeLeads.length - 1) {
            this.callModeCurrentLeadIndex++;
            this.updateCallModeDisplay();
            this.animateLeadTransition('next');
        }
    }

    callModeNextLeadOrCycle() {
        if (this.callModeCurrentLeadIndex < this.callModeLeads.length - 1) {
            // Move to next lead
            this.callModeCurrentLeadIndex++;
        } else {
            // Cycle back to beginning
            this.callModeCurrentLeadIndex = 0;
        }
        this.updateCallModeDisplay();
        this.animateLeadTransition('next');
    }

    callModePreviousLead() {
        if (this.callModeCurrentLeadIndex > 0) {
            this.callModeCurrentLeadIndex--;
            this.updateCallModeDisplay();
            this.animateLeadTransition('previous');
        }
    }

    callModeRandomLead() {
        const randomIndex = Math.floor(Math.random() * this.callModeLeads.length);
        this.callModeCurrentLeadIndex = randomIndex;
        this.updateCallModeDisplay();
        this.animateLeadTransition('random');
    }

    animateLeadTransition(direction) {
        const leadCard = document.querySelector('.call-mode-lead-card');
        if (leadCard) {
            leadCard.style.transform = direction === 'next' ? 'translateX(20px)' : 
                                     direction === 'previous' ? 'translateX(-20px)' : 'scale(0.95)';
            leadCard.style.opacity = '0.7';
            
            setTimeout(() => {
                leadCard.style.transform = 'translateX(0) scale(1)';
                leadCard.style.opacity = '1';
            }, 150);
        }
    }

    showCallCompletionModal() {
        const completionForm = document.getElementById('callModeCompletion');
        const notesSection = document.getElementById('callModeNotesSection');
        
        if (completionForm && notesSection) {
            // Hide notes section and show completion form
            notesSection.style.display = 'none';
            completionForm.style.display = 'block';
            
            // Clear previous values
            document.getElementById('callCompletionOutcome').value = '';
            document.getElementById('callCompletionNotes').value = '';
            document.getElementById('callCompletionFollowUpDate').value = '';
            document.getElementById('callCompletionNextAction').value = 'none';
            
            // Focus on outcome select
            setTimeout(() => {
                document.getElementById('callCompletionOutcome').focus();
            }, 100);
        }
    }

    cancelCallCompletion() {
        const completionForm = document.getElementById('callModeCompletion');
        const notesSection = document.getElementById('callModeNotesSection');
        
        if (completionForm && notesSection) {
            // Hide completion form and show notes section
            completionForm.style.display = 'none';
            notesSection.style.display = 'block';
        }
    }

    async saveCallCompletion() {
        console.log('saveCallCompletion called'); // Debug log
        
        const outcomeSelect = document.getElementById('callCompletionOutcome');
        const notes = document.getElementById('callCompletionNotes').value;
        const followUpDate = document.getElementById('callCompletionFollowUpDate').value;
        const nextAction = document.getElementById('callCompletionNextAction').value;

        const outcome = outcomeSelect ? outcomeSelect.value : '';

        if (!outcome || outcome === '') {
            alert('Please select a call outcome.');
            if (outcomeSelect) {
                outcomeSelect.focus();
            }
            return;
        }

        const currentLead = this.callModeLeads[this.callModeCurrentLeadIndex];
        if (!currentLead) {
            console.log('No current lead found');
            return;
        }

        console.log('Saving call for lead:', currentLead.company); // Debug log

        // Create call log entry
        const callLog = {
            id: 'call-' + Date.now(),
            leadId: currentLead.id,
            leadName: currentLead.company,
            outcome: outcome,
            notes: notes,
            followUpDate: followUpDate || null,
            nextAction: nextAction,
            timestamp: new Date().toISOString(),
            duration: 0 // Could be calculated if needed
        };

        try {
            // Save call log
            await this.saveCallLog(callLog);
            console.log('Call log saved successfully');

            // Update lead with last called date
            currentLead.lastCalled = new Date().toISOString();
            await this.updateLead(currentLead.id, currentLead);
            console.log('Lead updated successfully');

            // Hide completion form and show notes section
            this.cancelCallCompletion();

            // Move to next lead (or cycle back to beginning if at end)
            this.callModeNextLeadOrCycle();

            // Update stats
            this.updateCallModeStats();

            // Update Lead Analytics widget with fresh data
            await this.updateLeadAnalyticsWidget(this.callModeLeads[this.callModeCurrentLeadIndex]);

            // Show success message
            this.showNotification('Call logged successfully!', 'success');
        } catch (error) {
            console.error('Error saving call completion:', error);
            alert('Error saving call. Please try again.');
        }
    }

    async saveCallLog(callLog) {
        if (!this.db) {
            await this.initDatabase();
        }
        
        const callLogs = this.db.callLogs || [];
        callLogs.push(callLog);
        this.db.callLogs = callLogs;
        
        await this.saveToStorage('callLogs', callLogs);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    callModeSaveNotes() {
        // Notes are auto-saved as user types, but this provides explicit save
        console.log('Call mode notes saved:', this.callModeNotes);
    }

    callModeClearNotes() {
        this.callModeNotes = '';
        const notesTextarea = document.getElementById('callModeNotes');
        if (notesTextarea) {
            notesTextarea.value = '';
        }
    }

    async updateCallModeStats() {
        const allLeads = await this.getAllLeads();
        const callLogs = await this.getCallLogs();
        
        // Calculate today's calls
        const today = new Date().toDateString();
        const callsToday = callLogs.filter(log => 
            new Date(log.timestamp).toDateString() === today
        ).length;

        // Calculate meetings set
        const meetingsSet = callLogs.filter(log => 
            log.outcome === 'meeting_set'
        ).length;

        // Calculate success rate
        const totalCalls = callLogs.length;
        const successRate = totalCalls > 0 ? Math.round((meetingsSet / totalCalls) * 100) : 0;

        // Update display
        const callsTodayEl = document.getElementById('callModeCallsToday');
        const meetingsSetEl = document.getElementById('callModeMeetingsSet');
        const successRateEl = document.getElementById('callModeSuccessRate');

        if (callsTodayEl) callsTodayEl.textContent = callsToday;
        if (meetingsSetEl) meetingsSetEl.textContent = meetingsSet;
        if (successRateEl) successRateEl.textContent = `${successRate}%`;
    }

    async updateLeadAnalyticsWidget(currentLead) {
        try {
            // Get all leads and call logs for analytics
            const allLeads = await this.getAllLeads();
            const callLogs = await this.getCallLogs();
            
            // Calculate metrics
            const totalLeads = allLeads.length;
            const queueLeads = allLeads.filter(lead => lead.queue === 'call_queue');
            const leadsInQueue = queueLeads.length;
            
            // Calculate new leads this week
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const newLeadsWeek = allLeads.filter(lead => 
                new Date(lead.dateAdded) >= oneWeekAgo
            ).length;

            // Update Lead Analytics widget
            const totalLeadsEl = document.getElementById('totalLeads');
            const newLeadsWeekEl = document.getElementById('newLeadsWeek');
            const leadsInQueueEl = document.getElementById('leadsInQueue');

            if (totalLeadsEl) totalLeadsEl.textContent = totalLeads;
            if (newLeadsWeekEl) newLeadsWeekEl.textContent = newLeadsWeek;
            if (leadsInQueueEl) leadsInQueueEl.textContent = leadsInQueue;

            // Update call mode stats as well
            await this.updateCallModeStats();
            
        } catch (error) {
            console.error('Error updating Lead Analytics widget:', error);
        }
    }

    updateMiniQueueWithCurrentLead(currentLead) {
        const companyNameEl = document.getElementById('miniCompanyName');
        const stateEl = document.getElementById('miniState');
        const websiteEl = document.getElementById('miniWebsite');
        const callBtn = document.getElementById('miniCallBtn');
        
        if (!currentLead) {
            companyNameEl.textContent = 'No leads in queue';
            stateEl.textContent = '-';
            websiteEl.href = '#';
            websiteEl.textContent = 'Visit Site';
            websiteEl.style.display = 'none';
            callBtn.disabled = true;
            return;
        }
        
        // Update with current lead info
        companyNameEl.textContent = currentLead.company || 'Unknown Company';
        stateEl.textContent = currentLead.state || '-';
        
        if (currentLead.website && currentLead.website !== '-') {
            websiteEl.href = currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`;
            websiteEl.textContent = 'Visit Site';
            websiteEl.style.display = 'inline';
        } else {
            websiteEl.href = '#';
            websiteEl.textContent = 'Visit Site';
            websiteEl.style.display = 'none';
        }
        
        // Update call button
        callBtn.disabled = !currentLead.phone || currentLead.phone === '-';
        
        // Add visual indicator that this is the current lead
        const miniQueueCard = document.querySelector('.mini-queue-card');
        if (miniQueueCard) {
            miniQueueCard.classList.add('current-lead-highlight');
        }
    }

    handleCallModeKeyboard(e) {
        // Keyboard shortcuts for call mode
        switch(e.key) {
            case 'Escape':
                this.exitCallMode();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.callModeNextLead();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.callModePreviousLead();
                break;
            case ' ':
                e.preventDefault();
                this.callModeCall();
                break;
            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.callModeCopyPhone();
                }
                break;
            case 'r':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.callModeRandomLead();
                }
                break;
        }
    }

    async getCallLogs() {
        if (!this.db) {
            await this.initDatabase();
        }
        return this.db.callLogs || [];
    }

    // Script Management Functionality
    async initScriptManagement() {
        await this.loadScripts();
        this.setupScriptManagementEventListeners();
        this.updateScriptSelector();
    }

    setupScriptManagementEventListeners() {
        // Script Management Modal
        const scriptManagementModal = document.getElementById('scriptManagementModal');
        const closeScriptModal = document.getElementById('closeScriptModal');
        const cancelScriptModal = document.getElementById('cancelScriptModal');
        
        if (closeScriptModal) {
            closeScriptModal.addEventListener('click', () => this.closeScriptManagement());
        }
        
        if (cancelScriptModal) {
            cancelScriptModal.addEventListener('click', () => this.closeScriptManagement());
        }

        // Script Management Tabs
        const scriptTabs = document.querySelectorAll('.script-management-tabs .tab-btn');
        scriptTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchScriptTab(e.target.dataset.tab));
        });

        // Script List Actions
        const createNewScriptBtn = document.getElementById('createNewScriptBtn');
        if (createNewScriptBtn) {
            createNewScriptBtn.addEventListener('click', () => this.createNewScript());
        }

        // Script Editor Actions
        const saveScriptBtn = document.getElementById('saveScriptBtn');
        if (saveScriptBtn) {
            saveScriptBtn.addEventListener('click', () => this.saveScript());
        }

        const deleteScriptBtn = document.getElementById('deleteScriptBtn');
        if (deleteScriptBtn) {
            deleteScriptBtn.addEventListener('click', () => this.deleteScript());
        }

        // Modal backdrop click
        if (scriptManagementModal) {
            scriptManagementModal.addEventListener('click', (e) => {
                if (e.target === scriptManagementModal) {
                    this.closeScriptManagement();
                }
            });
        }

        // Call Completion Form
        const cancelCallCompletion = document.getElementById('cancelCallCompletion');
        const saveCallCompletion = document.getElementById('saveCallCompletion');
        
        if (cancelCallCompletion) {
            cancelCallCompletion.addEventListener('click', () => this.cancelCallCompletion());
        }
        
        if (saveCallCompletion) {
            saveCallCompletion.addEventListener('click', () => this.saveCallCompletion());
        }
    }

    async loadScripts() {
        try {
            const scripts = await this.getFromStorage('callScripts');
            this.callScripts = scripts || [];
        } catch (error) {
            console.error('Error loading scripts:', error);
            this.callScripts = [];
        }
    }


    async saveScripts() {
        await this.saveToStorage('callScripts', this.callScripts);
    }

    updateScriptSelector() {
        const scriptSelector = document.getElementById('scriptSelector');
        if (!scriptSelector) return;

        // Clear existing options except the first one
        scriptSelector.innerHTML = '<option value="">Select Script...</option>';

        // Add script options
        this.callScripts.forEach(script => {
            const option = document.createElement('option');
            option.value = script.id;
            option.textContent = script.name;
            option.className = `script-type-${script.type}`;
            scriptSelector.appendChild(option);
        });
    }

    selectScript(scriptId) {
        if (!scriptId) {
            this.currentScript = null;
            this.updateScriptDisplay();
            return;
        }

        const script = this.callScripts.find(s => s.id === scriptId);
        if (script) {
            this.currentScript = script;
            this.updateScriptDisplay();
        }
    }

    updateScriptDisplay() {
        const scriptContent = document.getElementById('scriptContent');
        if (!scriptContent) return;

        if (this.currentScript) {
            scriptContent.innerHTML = `<div class="script-text">${this.currentScript.content}</div>`;
        } else {
            scriptContent.innerHTML = `
                <div class="no-script">
                    <i class="fas fa-file-alt"></i>
                    <p>Select a script to display here</p>
                </div>
            `;
        }
    }

    copyCurrentScript() {
        if (this.currentScript) {
            navigator.clipboard.writeText(this.currentScript.content).then(() => {
                // Show success feedback
                const btn = document.getElementById('copyScriptBtn');
                if (btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
                    btn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = '';
                    }, 2000);
                }
            }).catch(() => {
                // Fallback for older browsers
                this.copyToClipboard(this.currentScript.content);
            });
        }
    }

    clearCurrentScript() {
        this.currentScript = null;
        this.updateScriptDisplay();
        
        const scriptSelector = document.getElementById('scriptSelector');
        if (scriptSelector) {
            scriptSelector.value = '';
        }
    }

    showScriptManagement() {
        const modal = document.getElementById('scriptManagementModal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadScriptList();
            this.switchScriptTab('script-list');
        }
    }

    closeScriptManagement() {
        const modal = document.getElementById('scriptManagementModal');
        if (modal) {
            modal.style.display = 'none';
            this.clearScriptEditor();
        }
    }

    switchScriptTab(tabName) {
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.script-management-tabs .tab-btn');
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Update tab content
        const tabContents = document.querySelectorAll('#scriptManagementModal .tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === tabName) {
                content.classList.add('active');
            }
        });

        // Show/hide action buttons
        const saveBtn = document.getElementById('saveScriptBtn');
        const deleteBtn = document.getElementById('deleteScriptBtn');
        
        if (tabName === 'script-editor') {
            if (saveBtn) saveBtn.style.display = 'inline-block';
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
        } else {
            if (saveBtn) saveBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = 'none';
        }
    }

    loadScriptList() {
        const scriptList = document.getElementById('scriptList');
        if (!scriptList) return;

        if (this.callScripts.length === 0) {
            scriptList.innerHTML = `
                <div class="script-list-empty">
                    <i class="fas fa-file-alt"></i>
                    <h4>No Scripts Yet</h4>
                    <p>Create your first call script to get started</p>
                </div>
            `;
            return;
        }

        scriptList.innerHTML = this.callScripts.map(script => `
            <div class="script-item" data-script-id="${script.id}">
                <div class="script-item-header">
                    <h5 class="script-item-name">${script.name}</h5>
                    <span class="script-item-type script-type-${script.type}">${script.type.replace('-', ' ')}</span>
                </div>
                <div class="script-item-preview">${script.content.substring(0, 150)}${script.content.length > 150 ? '...' : ''}</div>
                <div class="script-item-tags">
                    ${script.tags.map(tag => `<span class="script-tag">${tag}</span>`).join('')}
                </div>
                <div class="script-item-actions">
                    <button class="script-item-btn edit" onclick="crm.editScript('${script.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="script-item-btn delete" onclick="crm.confirmDeleteScript('${script.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    createNewScript() {
        this.switchScriptTab('script-editor');
        this.clearScriptEditor();
        
        // Focus on script name input
        setTimeout(() => {
            const nameInput = document.getElementById('scriptName');
            if (nameInput) nameInput.focus();
        }, 100);
    }

    editScript(scriptId) {
        const script = this.callScripts.find(s => s.id === scriptId);
        if (!script) return;

        this.switchScriptTab('script-editor');
        
        // Populate editor
        document.getElementById('scriptName').value = script.name;
        document.getElementById('scriptType').value = script.type;
        document.getElementById('scriptContentEditor').value = script.content;
        document.getElementById('scriptTags').value = script.tags.join(', ');
        
        // Store current script ID for editing
        this.editingScriptId = scriptId;
    }

    clearScriptEditor() {
        document.getElementById('scriptName').value = '';
        document.getElementById('scriptType').value = 'cold-call';
        document.getElementById('scriptContentEditor').value = '';
        document.getElementById('scriptTags').value = '';
        this.editingScriptId = null;
    }

    async saveScript() {
        const name = document.getElementById('scriptName').value.trim();
        const type = document.getElementById('scriptType').value;
        const content = document.getElementById('scriptContentEditor').value.trim();
        const tags = document.getElementById('scriptTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);

        if (!name || !content) {
            alert('Please fill in script name and content.');
            return;
        }

        const scriptData = {
            name,
            type,
            content,
            tags,
            dateModified: new Date().toISOString()
        };

        if (this.editingScriptId) {
            // Update existing script
            const scriptIndex = this.callScripts.findIndex(s => s.id === this.editingScriptId);
            if (scriptIndex !== -1) {
                this.callScripts[scriptIndex] = {
                    ...this.callScripts[scriptIndex],
                    ...scriptData
                };
            }
        } else {
            // Create new script
            const newScript = {
                id: 'script-' + Date.now(),
                ...scriptData,
                dateCreated: new Date().toISOString()
            };
            this.callScripts.push(newScript);
        }

        await this.saveScripts();
        this.loadScriptList();
        this.updateScriptSelector();
        this.switchScriptTab('script-list');
        this.clearScriptEditor();
    }

    async deleteScript(scriptId) {
        if (confirm('Are you sure you want to delete this script?')) {
            this.callScripts = this.callScripts.filter(s => s.id !== scriptId);
            await this.saveScripts();
            this.loadScriptList();
            this.updateScriptSelector();
            
            // Clear current script if it was deleted
            if (this.currentScript && this.currentScript.id === scriptId) {
                this.clearCurrentScript();
            }
        }
    }

    confirmDeleteScript(scriptId) {
        this.deleteScript(scriptId);
    }

    copyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }

    // Thomasnet Scraper
    initThomasnetScraper() {
        this.scraperActive = false;
        this.scrapedResults = [];
        this.currentPage = 1;
        this.maxPages = 0;
        
        this.setupScraperEventListeners();
    }

    setupScraperEventListeners() {
        // Show scraper widget
        const runScraperBtn = document.getElementById('runThomasnetScraperBtn');
        if (runScraperBtn) {
            runScraperBtn.addEventListener('click', () => this.showScraperWidget());
        }

        // Close scraper widget
        const closeScraperBtn = document.getElementById('closeScraperBtn');
        if (closeScraperBtn) {
            closeScraperBtn.addEventListener('click', () => this.hideScraperWidget());
        }

        // Start scraping
        const startScrapingBtn = document.getElementById('startScrapingBtn');
        if (startScrapingBtn) {
            startScrapingBtn.addEventListener('click', () => this.startScraping());
        }

        // Stop scraping
        const stopScrapingBtn = document.getElementById('stopScrapingBtn');
        if (stopScrapingBtn) {
            stopScrapingBtn.addEventListener('click', () => this.stopScraping());
        }


        // Import results
        const importResultsBtn = document.getElementById('importResultsBtn');
        if (importResultsBtn) {
            importResultsBtn.addEventListener('click', () => this.importScrapedResults());
        }

        // Export results
        const exportResultsBtn = document.getElementById('exportResultsBtn');
        if (exportResultsBtn) {
            exportResultsBtn.addEventListener('click', () => this.exportScrapedResults());
        }

        // Manual scraping
        const manualScrapingBtn = document.getElementById('manualScrapingBtn');
        if (manualScrapingBtn) {
            manualScrapingBtn.addEventListener('click', () => this.showManualEntryForm());
        }
    }

    showScraperWidget() {
        const scraperWidget = document.getElementById('scraperWidget');
        if (scraperWidget) {
            scraperWidget.style.display = 'block';
        }
    }

    hideScraperWidget() {
        const scraperWidget = document.getElementById('scraperWidget');
        if (scraperWidget) {
            scraperWidget.style.display = 'none';
            this.stopScraping();
        }
    }


    async startScraping() {
        if (this.scraperActive) return;
        
        this.scraperActive = true;
        this.scrapedResults = [];
        this.currentPage = 1;
        this.scraperTabId = null;
        
        // Update UI
        const startBtn = document.getElementById('startScrapingBtn');
        const stopBtn = document.getElementById('stopScrapingBtn');
        const progress = document.getElementById('scraperProgress');
        const status = document.getElementById('scraperStatus');
        
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-block';
        if (progress) progress.style.display = 'block';
        if (status) {
            status.textContent = 'Opening Thomasnet in new tab...';
            status.className = 'scraper-status info';
        }
        
        try {
            // Open Thomasnet in new tab
            const service = document.getElementById('scraperService').value;
            const state = document.getElementById('scraperState').value;
            
            // Extract category ID from service value (format: "service-name-12345678")
            const categoryId = service.split('-').pop();
            const stateSlug = state || '';
            
            // Build URL with state filter if selected
            let url = `https://www.thomasnet.com/suppliers/search?cov=NA&heading=${categoryId}&sort=REVENUE_ASC`;
            if (stateSlug) {
                url += `&state=${stateSlug}`;
            }
            
            // Open new tab
            const tab = await chrome.tabs.create({ url: url, active: true });
            this.scraperTabId = tab.id;
            
            // Wait for tab to load
            await this.waitForTabLoad(tab.id);
            
            // Start scraping
            await this.scrapeTab(tab.id);
            
        } catch (error) {
            console.error('Scraping error:', error);
            this.updateScraperStatus('Error during scraping: ' + error.message, 'error');
            this.stopScraping();
        }
    }

    stopScraping() {
        this.scraperActive = false;
        
        // Close the scraper tab if it exists
        if (this.scraperTabId) {
            chrome.tabs.remove(this.scraperTabId);
            this.scraperTabId = null;
        }
        
        // Save what was scraped so far
        if (this.scrapedResults.length > 0) {
            this.finishScraping();
        } else {
            // Update UI
            const startBtn = document.getElementById('startScrapingBtn');
            const stopBtn = document.getElementById('stopScrapingBtn');
            const progress = document.getElementById('scraperProgress');
            
            if (startBtn) startBtn.style.display = 'inline-block';
            if (stopBtn) stopBtn.style.display = 'none';
            if (progress) progress.style.display = 'none';
            
            this.updateScraperStatus('Scraping stopped - no results to save', 'info');
        }
    }

    async waitForTabLoad(tabId) {
        return new Promise((resolve) => {
            const checkTab = () => {
                chrome.tabs.get(tabId, (tab) => {
                    if (chrome.runtime.lastError) {
                        resolve();
                        return;
                    }
                    if (tab.status === 'complete') {
                        resolve();
                    } else {
                        setTimeout(checkTab, 500);
                    }
                });
            };
            checkTab();
        });
    }

    async scrapeTab(tabId) {
        try {
            // Wait a bit for the page to fully load
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Scrape the current page
            const response = await chrome.tabs.sendMessage(tabId, { action: 'scrapePage' });
            
            if (response && response.success) {
                const pageResults = response.data || [];
                
                // Add to results
                this.scrapedResults.push(...pageResults);
                
                // Update progress
                this.updateScraperProgress();
                
                // Update status
                this.updateScraperStatus(`Scraped page ${this.currentPage}, found ${pageResults.length} companies (Total: ${this.scrapedResults.length})`, 'info');
                
                // Check if we should continue to next page
                const maxResults = parseInt(document.getElementById('scraperMaxResults').value) || 100;
                
                if (this.scrapedResults.length >= maxResults) {
                    this.updateScraperStatus(`Reached maximum results (${maxResults}). Finishing scraping...`, 'info');
                    this.finishScraping();
                    return;
                }
                
                // Try to go to next page
                const nextResponse = await chrome.tabs.sendMessage(tabId, { action: 'goToNextPage' });
                
                if (nextResponse && nextResponse.success) {
                    this.currentPage++;
                    
                    // Wait for page to load
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Continue scraping
                    if (this.scraperActive) {
                        await this.scrapeTab(tabId);
                    }
                } else {
                    this.finishScraping();
                }
            } else {
                this.updateScraperStatus('Failed to scrape page. Content script may not be loaded.', 'error');
                this.stopScraping();
            }
            
        } catch (error) {
            console.error('Error scraping tab:', error);
            this.updateScraperStatus('Error scraping tab: ' + error.message, 'error');
            this.stopScraping();
        }
    }


    updateScraperProgress() {
        const maxResults = parseInt(document.getElementById('scraperMaxResults').value) || 100;
        const progress = (this.scrapedResults.length / maxResults) * 100;
        
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = Math.min(progress, 100) + '%';
        }
        
        if (progressText) {
            progressText.textContent = `${Math.min(progress, 100).toFixed(0)}% (${this.scrapedResults.length}/${maxResults})`;
        }
    }

    updateScraperStatus(message, type = 'info') {
        const status = document.getElementById('scraperStatus');
        if (status) {
            status.textContent = message;
            status.className = `scraper-status ${type}`;
        }
    }

    async finishScraping() {
        this.scraperActive = false;
        
        // Close the scraper tab if it exists
        if (this.scraperTabId) {
            chrome.tabs.remove(this.scraperTabId);
            this.scraperTabId = null;
        }
        
        // Update UI
        const startBtn = document.getElementById('startScrapingBtn');
        const stopBtn = document.getElementById('stopScrapingBtn');
        const progress = document.getElementById('scraperProgress');
        const results = document.getElementById('scraperResults');
        const summary = document.getElementById('resultsSummary');
        
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
        if (progress) progress.style.display = 'none';
        if (results) results.style.display = 'block';
        
        if (summary) {
            summary.innerHTML = `
                <p><strong>Scraping Complete!</strong></p>
                <p>Total companies found: ${this.scrapedResults.length}</p>
                <p>Pages scraped: ${this.currentPage}</p>
                <p>Service: ${document.getElementById('scraperService').selectedOptions[0]?.text || 'N/A'}</p>
                <p>State: ${document.getElementById('scraperState').selectedOptions[0]?.text || 'N/A'}</p>
            `;
        }
        
        this.updateScraperStatus(`Scraping complete! Found ${this.scrapedResults.length} companies. Importing to CRM...`, 'info');
        
        // Automatically import results to CRM
        if (this.scrapedResults.length > 0) {
            try {
                await this.importScrapedResults();
                this.updateScraperStatus(`Successfully imported ${this.scrapedResults.length} companies to CRM!`, 'success');
            } catch (error) {
                console.error('Error auto-importing results:', error);
                this.updateScraperStatus(`Scraping complete but import failed: ${error.message}`, 'error');
            }
        } else {
            this.updateScraperStatus('Scraping complete but no companies found', 'info');
        }
    }

    async importScrapedResults() {
        if (this.scrapedResults.length === 0) {
            this.showNotification('No results to import', 'error');
            return;
        }
        
        try {
            // Convert to lead format
            const leads = this.scrapedResults.map(result => ({
                company: result.name || 'Unknown Company',
                website: result.website || '',
                phone: result.phone || '',
                state: result.state || '',
                industry: result.service || '',
                source: 'Thomasnet Scraper',
                dateAdded: new Date().toISOString(),
                status: 'prospect',
                queue: 'prospecting_queue',
                stage: 'unreviewed' // Add to unreviewed stage
            }));
            
            // Save to prospects table with better error handling
            let successCount = 0;
            let errorCount = 0;
            
            // Get existing prospects
            const existingProspects = await this.getProspects();
            
            for (const lead of leads) {
                try {
                    // Add to prospects array
                    const prospect = {
                        ...lead,
                        id: Date.now() + Math.random() // Generate unique ID
                    };
                    existingProspects.push(prospect);
                    successCount++;
                } catch (error) {
                    console.error('Error adding prospect:', error, lead);
                    errorCount++;
                }
            }
            
            // Save all prospects at once
            await this.saveToStorage('prospects', existingProspects);
            
            if (errorCount > 0) {
                this.showNotification(`Imported ${successCount} prospects to unreviewed, ${errorCount} failed`, 'warning');
            } else {
                this.showNotification(`Successfully imported ${successCount} prospects to unreviewed`, 'success');
            }
            
            // Update all views to show the new prospects
            await this.updateAllViews();
            
            // Switch to prospecting tab to show the new prospects
            this.switchTab('prospecting');
            
        } catch (error) {
            console.error('Error importing results:', error);
            this.showNotification('Error importing results: ' + error.message, 'error');
        }
    }

    exportScrapedResults() {
        if (this.scrapedResults.length === 0) {
            this.showNotification('No results to export', 'error');
            return;
        }
        
        try {
            // Convert to CSV
            const csvContent = this.convertToCSV(this.scrapedResults);
            
            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `thomasnet_scraped_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Results exported successfully!', 'success');
            
        } catch (error) {
            console.error('Error exporting results:', error);
            this.showNotification('Error exporting results: ' + error.message, 'error');
        }
    }

    convertToCSV(data) {
        const headers = ['Company', 'Website', 'Phone', 'State', 'Service'];
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = [
                `"${row.name}"`,
                `"${row.website}"`,
                `"${row.phone}"`,
                `"${row.state}"`,
                `"${row.service}"`
            ];
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }


    showManualEntryInstructions() {
        // Show instructions for manual entry
        const instructions = document.createElement('div');
        instructions.className = 'scraper-instructions';
        instructions.innerHTML = `
            <div class="instructions-content">
                <h4><i class="fas fa-info-circle"></i> Manual Entry Instructions</h4>
                <p>Due to browser security restrictions, automated scraping is not available. Here's how to use manual entry:</p>
                <ol>
                    <li>Click the "Manual Entry" button below</li>
                    <li>Fill in the company details (name is required)</li>
                    <li>Click "Add Company" to add it to your results</li>
                    <li>Repeat for each company you want to add</li>
                    <li>Use "Import to CRM" when you're done</li>
                </ol>
                <p><strong>Tip:</strong> You can open Thomasnet in another tab to copy company information while using this form.</p>
            </div>
        `;
        
        const scraperWidget = document.getElementById('scraperWidget');
        if (scraperWidget) {
            scraperWidget.insertBefore(instructions, scraperWidget.querySelector('.scraper-browser'));
        }
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (instructions.parentNode) {
                instructions.parentNode.removeChild(instructions);
            }
        }, 10000);
    }

    showManualEntryForm() {
        // Create manual entry modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-hand-paper"></i> Manual Company Entry</h3>
                    <button class="close-btn" id="closeManualEntry">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="manualCompanyName">Company Name *</label>
                        <input type="text" id="manualCompanyName" placeholder="Enter company name" required>
                    </div>
                    <div class="form-group">
                        <label for="manualWebsite">Website</label>
                        <input type="url" id="manualWebsite" placeholder="https://www.company.com">
                    </div>
                    <div class="form-group">
                        <label for="manualPhone">Phone</label>
                        <input type="tel" id="manualPhone" placeholder="(555) 123-4567">
                    </div>
                    <div class="form-group">
                        <label for="manualState">State</label>
                        <select id="manualState">
                            <option value="">Select State...</option>
                            <option value="alabama">Alabama</option>
                            <option value="alaska">Alaska</option>
                            <option value="arizona">Arizona</option>
                            <option value="arkansas">Arkansas</option>
                            <option value="california">California</option>
                            <option value="northern-california">Northern California</option>
                            <option value="southern-california">Southern California</option>
                            <option value="colorado">Colorado</option>
                            <option value="connecticut">Connecticut</option>
                            <option value="delaware">Delaware</option>
                            <option value="florida">Florida</option>
                            <option value="georgia">Georgia</option>
                            <option value="hawaii">Hawaii</option>
                            <option value="idaho">Idaho</option>
                            <option value="illinois">Illinois</option>
                            <option value="indiana">Indiana</option>
                            <option value="iowa">Iowa</option>
                            <option value="kansas">Kansas</option>
                            <option value="kentucky">Kentucky</option>
                            <option value="louisiana">Louisiana</option>
                            <option value="maine">Maine</option>
                            <option value="maryland">Maryland</option>
                            <option value="massachusetts">Massachusetts</option>
                            <option value="michigan">Michigan</option>
                            <option value="minnesota">Minnesota</option>
                            <option value="mississippi">Mississippi</option>
                            <option value="missouri">Missouri</option>
                            <option value="montana">Montana</option>
                            <option value="nebraska">Nebraska</option>
                            <option value="nevada">Nevada</option>
                            <option value="new-hampshire">New Hampshire</option>
                            <option value="new-jersey">New Jersey</option>
                            <option value="new-mexico">New Mexico</option>
                            <option value="new-york">New York</option>
                            <option value="north-carolina">North Carolina</option>
                            <option value="north-dakota">North Dakota</option>
                            <option value="ohio">Ohio</option>
                            <option value="oklahoma">Oklahoma</option>
                            <option value="oregon">Oregon</option>
                            <option value="pennsylvania">Pennsylvania</option>
                            <option value="rhode-island">Rhode Island</option>
                            <option value="south-carolina">South Carolina</option>
                            <option value="south-dakota">South Dakota</option>
                            <option value="tennessee">Tennessee</option>
                            <option value="texas">Texas</option>
                            <option value="utah">Utah</option>
                            <option value="vermont">Vermont</option>
                            <option value="virginia">Virginia</option>
                            <option value="washington">Washington</option>
                            <option value="west-virginia">West Virginia</option>
                            <option value="wisconsin">Wisconsin</option>
                            <option value="wyoming">Wyoming</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="manualService">Service</label>
                        <select id="manualService">
                            <option value="">Select Service...</option>
                            <option value="rapid-prototyping-services-66148859">Rapid Prototyping Services</option>
                            <option value="plastic-rapid-prototyping-services-97007158">Plastic Rapid Prototyping Services</option>
                            <option value="machining-assembly-finishing-96098819">Machining Assembly Finishing</option>
                            <option value="metal-finishing-50560200">Metal Finishing</option>
                            <option value="sealants-73231607">Sealants</option>
                            <option value="cnc-milling-51276103">CNC Milling</option>
                            <option value="contract-grinding-polishing-36140606">Contract Grinding Polishing</option>
                            <option value="robotic-inspection-97009744">Robotic Inspection</option>
                            <option value="robotic-tracking-systems-68643642">Robotic Tracking Systems</option>
                            <option value="robotic-positioners-62281456">Robotic Positioners</option>
                            <option value="robotic-palletizers-56493208">Robotic Palletizers</option>
                            <option value="precision-grinding-36191302">Precision Grinding</option>
                            <option value="deburring-21790803">Deburring</option>
                            <option value="metal-3d-printing-additive-manufacturing-97012849">Metal 3D Printing Additive Manufacturing</option>
                            <option value="additive-manufacturing-3d-printing-85451102">Additive Manufacturing 3D Printing</option>
                            <option value="robotic-welding-services-93620391">Robotic Welding Services</option>
                            <option value="welding-services-93550804">Welding Services</option>
                            <option value="cnc-machining-45330503">CNC Machining</option>
                            <option value="cnc-turning-89622625">CNC Turning</option>
                            <option value="production-machining-45620424">Production Machining</option>
                            <option value="general-machining-45340403">General Machining</option>
                            <option value="complex-difficult-machining-96095294">Complex Difficult Machining</option>
                            <option value="foam-machining-services-97008321">Foam Machining Services</option>
                            <option value="precision-machining-45620408">Precision Machining</option>
                            <option value="prototype-machining-45620440">Prototype Machining</option>
                            <option value="special-machining-2900">Special Machining</option>
                            <option value="general-contract-machining-2894">General Contract Machining</option>
                            <option value="machined-parts-57340606">Machined Parts</option>
                            <option value="waterjet-cutting-services-21533906">Waterjet Cutting Services</option>
                            <option value="cnc-cutting-services-21533153">CNC Cutting Services</option>
                            <option value="plasma-cutting-services-58820804">Plasma Cutting Services</option>
                            <option value="stainless-steel-cutting-services-78084407">Stainless Steel Cutting Services</option>
                            <option value="metal-laser-cutting-services-43277151">Metal Laser Cutting Services</option>
                            <option value="powder-coating-services-62441357">Powder Coating Services</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="manualNotes">Notes</label>
                        <textarea id="manualNotes" placeholder="Additional notes about this company" rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelManualEntry">Cancel</button>
                    <button class="btn btn-primary" id="addManualCompany">Add Company</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('closeManualEntry').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        document.getElementById('cancelManualEntry').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        document.getElementById('addManualCompany').addEventListener('click', () => {
            this.addManualCompany();
        });
        
        // Show modal
        setTimeout(() => modal.classList.add('show'), 10);
    }

    addManualCompany() {
        const name = document.getElementById('manualCompanyName').value.trim();
        const website = document.getElementById('manualWebsite').value.trim();
        const phone = document.getElementById('manualPhone').value.trim();
        const state = document.getElementById('manualState').value;
        const service = document.getElementById('manualService').value;
        const notes = document.getElementById('manualNotes').value.trim();
        
        if (!name) {
            this.showNotification('Company name is required', 'error');
            return;
        }
        
        // Add to scraped results
        const companyData = {
            name: name,
            website: website,
            phone: phone,
            state: state,
            service: service,
            notes: notes
        };
        
        this.scrapedResults.push(companyData);
        
        // Update progress
        this.updateScraperProgress();
        
        // Show results section
        const results = document.getElementById('scraperResults');
        if (results) {
            results.style.display = 'block';
        }
        
        // Update summary
        const summary = document.getElementById('resultsSummary');
        if (summary) {
            summary.innerHTML = `
                <p><strong>Manual Entry Results</strong></p>
                <p>Total companies added: ${this.scrapedResults.length}</p>
                <p>Last added: ${name}</p>
            `;
        }
        
        // Clear form
        document.getElementById('manualCompanyName').value = '';
        document.getElementById('manualWebsite').value = '';
        document.getElementById('manualPhone').value = '';
        document.getElementById('manualNotes').value = '';
        
        this.showNotification(`Added ${name} to results`, 'success');
        
        // Close modal
        const modal = document.querySelector('.modal');
        if (modal) {
            document.body.removeChild(modal);
        }
    }
}

// Initialize the CRM when the page loads
let crm;
document.addEventListener('DOMContentLoaded', () => {
    crm = new SalesCRM();
});

// Add event listeners for email checkboxes
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('email-checkbox')) {
        crm.updateRecipientCount();
    }
});
