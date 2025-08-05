// BRS Labs Logline Evaluator - Supabase Client
// This file handles all database connections and operations

// Import Supabase client library
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

// Initialize Supabase client with correct credentials
const supabaseUrl = 'https://ueptlkutwllwhyfiebcd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcHRsa3V0d2xsd2h5ZmllYmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTUyNTEsImV4cCI6MjA2ODY3MTI1MX0.UyjjISjobu3JyQTDUALbwoulPltoSPRrI4l9FePOMVc';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Export for global use
window.supabase = supabase;

// Database helper functions
window.dbHelpers = {
    
    // User Management Functions
    async createUserProfile(userId, email, userType = 'credits', isAdmin = false) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .insert([{
                    id: userId,
                    email: email,
                    user_type: userType,
                    is_admin: isAdmin,
                    credits: userType === 'admin' ? 999999 : 0
                }])
                .select()
                .single();
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating user profile:', error);
            return { success: false, error: error.message };
        }
    },

    async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting user profile:', error);
            return { success: false, error: error.message };
        }
    },

    async updateUserCredits(userId, newCreditAmount) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .update({ credits: newCreditAmount })
                .eq('id', userId)
                .select()
                .single();
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating credits:', error);
            return { success: false, error: error.message };
        }
    },

    // Student Code Functions
    async createStudentCodes(codes, createdBy) {
        try {
            const { data, error } = await supabase
                .from('student_codes')
                .insert(codes.map(code => ({
                    code: code.code,
                    code_type: code.code_type || 'time_based',
                    months: code.months,
                    credits: code.credits,
                    created_by: createdBy
                })))
                .select();
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating student codes:', error);
            return { success: false, error: error.message };
        }
    },

    async getStudentCode(code) {
        try {
            const { data, error } = await supabase
                .from('student_codes')
                .select('*')
                .eq('code', code)
                .eq('used', false)
                .single();
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting student code:', error);
            return { success: false, error: error.message };
        }
    },

    async useStudentCode(code, userId) {
        try {
            const { data, error } = await supabase
                .from('student_codes')
                .update({
                    used: true,
                    used_by: userId,
                    used_at: new Date().toISOString()
                })
                .eq('code', code)
                .eq('used', false)
                .select()
                .single();
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error using student code:', error);
            return { success: false, error: error.message };
        }
    },

    async getAllStudentCodes() {
        try {
            const { data, error } = await supabase
                .from('student_codes')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting all student codes:', error);
            return { success: false, error: error.message };
        }
    },

    // Submission Functions
    async createSubmission(userId, formData, claudeResponse) {
        try {
            const { data, error } = await supabase
                .from('submissions')
                .insert([{
                    user_id: userId,
                    form_data: formData,
                    claude_response: claudeResponse
                }])
                .select()
                .single();
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating submission:', error);
            return { success: false, error: error.message };
        }
    },

    async getUserSubmissions(userId) {
        try {
            const { data, error } = await supabase
                .from('submissions')
                .select('*')
                .eq('user_id', userId)
                .order('timestamp', { ascending: false });
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting user submissions:', error);
            return { success: false, error: error.message };
        }
    },

    async getAllSubmissions() {
        try {
            const { data, error } = await supabase
                .from('submissions')
                .select(`
                    *,
                    user_profiles:user_id (email)
                `)
                .order('timestamp', { ascending: false });
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting all submissions:', error);
            return { success: false, error: error.message };
        }
    },

    // Admin Functions
    async getAllUsers() {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting all users:', error);
            return { success: false, error: error.message };
        }
    },

    async updateUserStatus(userId, status) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .update({ status: status })
                .eq('id', userId)
                .select()
                .single();
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating user status:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteSubmission(submissionId) {
        try {
            const { data, error } = await supabase
                .from('submissions')
                .delete()
                .eq('id', submissionId)
                .select()
                .single();
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error deleting submission:', error);
            return { success: false, error: error.message };
        }
    }
};

// Authentication helper functions
window.authHelpers = {
    
    async signUp(email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error signing up:', error);
            return { success: false, error: error.message };
        }
    },

    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error signing in:', error);
            return { success: false, error: error.message };
        }
    },

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message };
        }
    },

    async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return { success: true, data: user };
        } catch (error) {
            console.error('Error getting current user:', error);
            return { success: false, error: error.message };
        }
    },

    async resetPassword(email) {
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}?reset=true`
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error resetting password:', error);
            return { success: false, error: error.message };
        }
    }
};

console.log('Supabase client initialized successfully');
