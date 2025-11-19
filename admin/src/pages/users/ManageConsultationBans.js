import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { format, parseISO, isAfter } from 'date-fns';

const ManageConsultationBans = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showLiftBanDialog, setShowLiftBanDialog] = useState(false);
  const [liftBanReason, setLiftBanReason] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [stats, setStats] = useState({
    totalBanned: 0,
    activeBans: 0,
    expiredBans: 0,
    totalCancellations: 0
  });

  useEffect(() => {
    fetchConsultationBans();
  }, []);

  const fetchConsultationBans = async () => {
    setLoading(true);
    try {
      // Fetch users with consultation ban information
      const response = await fetch('/api/admin/consultation-bans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch consultation bans');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching consultation bans:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load consultation bans',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLiftBan = async () => {
    if (!selectedUser || !liftBanReason.trim()) {
      setSnackbar({
        open: true,
        message: 'Please provide a reason for lifting the ban',
        severity: 'warning'
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/consultation-bans/${selectedUser.id}/lift`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: liftBanReason.trim(),
          admin_id: localStorage.getItem('adminId')
        })
      });

      if (!response.ok) {
        throw new Error('Failed to lift consultation ban');
      }

      setSnackbar({
        open: true,
        message: `Consultation ban lifted for ${selectedUser.full_name}`,
        severity: 'success'
      });

      setShowLiftBanDialog(false);
      setLiftBanReason('');
      setSelectedUser(null);
      fetchConsultationBans();
    } catch (error) {
      console.error('Error lifting ban:', error);
      setSnackbar({
        open: true,
        message: 'Failed to lift consultation ban',
        severity: 'error'
      });
    }
  };

  const getBanStatus = (user) => {
    if (!user.consultation_ban_end) {
      return { status: 'none', label: 'No Ban', color: 'default' };
    }

    const banEnd = parseISO(user.consultation_ban_end);
    const now = new Date();

    if (isAfter(banEnd, now)) {
      return { status: 'active', label: 'Active Ban', color: 'error' };
    } else {
      return { status: 'expired', label: 'Expired', color: 'warning' };
    }
  };

  const formatBanDuration = (user) => {
    if (!user.consultation_ban_end) return 'N/A';
    
    const banEnd = parseISO(user.consultation_ban_end);
    return format(banEnd, 'MMM dd, yyyy HH:mm');
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id?.includes(searchTerm)
  );

  const bannedUsers = filteredUsers.filter(user => user.consultation_ban_end);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Consultation Bans
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <BlockIcon color="error" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Bans
                  </Typography>
                  <Typography variant="h5">
                    {stats.activeBans || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Expired Bans
                  </Typography>
                  <Typography variant="h5">
                    {stats.expiredBans || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Banned Users
                  </Typography>
                  <Typography variant="h5">
                    {stats.totalBanned || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ScheduleIcon color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Cancellations
                  </Typography>
                  <Typography variant="h5">
                    {stats.totalCancellations || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <TextField
          placeholder="Search by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchConsultationBans}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Ban Status</TableCell>
                <TableCell>Ban End Date</TableCell>
                <TableCell>Recent Cancellations</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : bannedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No banned users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                bannedUsers.map((user) => {
                  const banStatus = getBanStatus(user);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {user.full_name || 'Unknown User'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {user.id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={banStatus.label}
                          color={banStatus.color}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatBanDuration(user)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.recent_cancellations || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {banStatus.status === 'active' && (
                          <Tooltip title="Lift consultation ban">
                            <IconButton
                              color="primary"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowLiftBanDialog(true);
                              }}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="View user details">
                          <IconButton
                            color="info"
                            onClick={() => {
                              // Navigate to user details or show modal
                            }}
                          >
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Lift Ban Dialog */}
      <Dialog
        open={showLiftBanDialog}
        onClose={() => setShowLiftBanDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Lift Consultation Ban
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Lifting ban for: <strong>{selectedUser?.full_name}</strong>
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for lifting ban"
            fullWidth
            multiline
            rows={3}
            value={liftBanReason}
            onChange={(e) => setLiftBanReason(e.target.value)}
            placeholder="Enter reason for lifting the consultation ban..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLiftBanDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLiftBan}
            variant="contained"
            disabled={!liftBanReason.trim()}
          >
            Lift Ban
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ManageConsultationBans;
