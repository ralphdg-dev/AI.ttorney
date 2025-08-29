import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import BackButton from '../../components/ui/BackButton';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../lib/api-client';

export default function UserRegistration() {
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  // Date picker modal state (pattern reused from lawyer-reg)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [calendarCursor, setCalendarCursor] = useState<Date>(new Date());
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const [showYearSelect, setShowYearSelect] = useState(false);
  const today = new Date();

  const formatDate = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isComplete = Boolean(firstName && lastName && username && email && birthdate && passwordsMatch && agree);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {/* Header with BackButton */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 }}>
          <BackButton onPress={() => router.back()} />
        </View>

        {/* Main Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: 110, height: 110 }}
            resizeMode="contain"
          />
        </View>

        {/* Heading */}
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 16 }}>
          Create an Account
        </Text>

        {/* First/Last Name */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
              First Name <Text style={{ color: '#ef4444' }}>*</Text>
            </Text>
            <TextInput
              style={{ width: '100%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff', color: '#111827', marginBottom: 12 }}
              placeholder="First name"
              placeholderTextColor="#9ca3af"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
              Last Name <Text style={{ color: '#ef4444' }}>*</Text>
            </Text>
            <TextInput
              style={{ width: '100%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff', color: '#111827', marginBottom: 12 }}
              placeholder="Last name"
              placeholderTextColor="#9ca3af"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
        </View>

        {/* Username */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
          Username <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <TextInput
          style={{ width: '100%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#fff', color: '#111827', marginBottom: 12 }}
          placeholder="Username"
          placeholderTextColor="#9ca3af"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        {/* Email */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
          Email Address <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <TextInput
          style={{ width: '100%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#fff', color: '#111827', marginBottom: 12 }}
          placeholder="Email address"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Birthdate */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
          Birthdate <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <TouchableOpacity
          onPress={() => {
            const now = new Date();
            now.setHours(0,0,0,0);
            const base0 = (birthdate ? new Date(birthdate) : new Date());
            base0.setHours(0,0,0,0);
            const base = base0.getTime() > now.getTime() ? now : base0;
            setTempDate(base);
            setCalendarCursor(new Date(base.getFullYear(), base.getMonth(), 1));
            setShowDatePicker(true);
          }}
          activeOpacity={0.8}
          style={{ width: '100%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, backgroundColor: '#fff', marginBottom: 12 }}
        >
          <Text style={{ fontSize: 14, color: birthdate ? '#111827' : '#9ca3af' }}>
            {birthdate ? formatDate(birthdate) : 'Select date'}
          </Text>
        </TouchableOpacity>

        {/* Password */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
          Password <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={{ width: '100%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, paddingRight: 44, fontSize: 14, backgroundColor: '#fff', color: '#111827', marginBottom: 12 }}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
            <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
          Confirm Password <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={{ width: '100%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, paddingRight: 44, fontSize: 14, backgroundColor: '#fff', color: '#111827', marginBottom: 12 }}
            placeholder="Confirm password"
            placeholderTextColor="#9ca3af"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}>
            <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Terms checkbox */}
        <TouchableOpacity onPress={() => setAgree(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 18, height: 18, borderWidth: 1, borderColor: agree ? Colors.primary.blue : '#D1D5DB', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: agree ? Colors.primary.blue : 'transparent' }}>
            {agree && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text style={{ color: '#374151' }}>
            By continuing, you agree to our{" "}
            <Text 
              style={{ color: Colors.primary.blue, fontWeight: '600', textDecorationLine: 'underline' }}
              onPress={() => {
                // TODO: Navigate to Terms of Service page/modal
                console.log('Navigate to Terms of Service');
              }}
            >
              Terms of Service
            </Text>
            .
          </Text>
        </TouchableOpacity>

        {/* Primary Sign Up button */}
        <PrimaryButton
          title={loading ? "Creating Account..." : "Sign Up"}
          onPress={async () => {
            if (!isComplete) return;
            
            setLoading(true);
            try {
              const result = await apiClient.signUp({
                email,
                password,
                username,
                first_name: firstName,
                last_name: lastName,
                birthdate: birthdate?.toISOString().split('T')[0] || '',
                role: 'registered_user'
              });
              
              if (result.error) {
                Alert.alert('Registration Failed', result.error);
              } else {
                // Navigate directly to verify-otp with the email
                router.push(`./verify-otp?email=${encodeURIComponent(email)}` as any);
              }
            } catch {
              Alert.alert('Error', 'Failed to create account. Please try again.');
            } finally {
              setLoading(false);
            }
          }}
          disabled={!isComplete || loading}
        />

        {/* OR separator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
          <Text style={{ marginHorizontal: 12, color: '#6b7280' }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
        </View>

        {/* Google sign up */}
        <TouchableOpacity
          style={{ paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', flexDirection: 'row' }}
          onPress={() => { /* TODO: google sign up */ }}
        >
          <Image
            source={require('../../assets/images/registration/google.png')}
            style={{ width: 20, height: 20, marginRight: 8 }}
            resizeMode="contain"
          />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Sign Up with Google</Text>
        </TouchableOpacity>

        {/* Bottom link */}
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Text style={{ color: '#6b7280' }}>
            Already have an account?{' '}
            <Text style={{ color: Colors.primary.blue, fontWeight: '700' }} onPress={() => router.push('/login')}>Sign In</Text>
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Select Date</Text>

            {/* Header with month navigation */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  const y = calendarCursor.getFullYear();
                  const m = calendarCursor.getMonth();
                  const prev = new Date(y, m - 1, 1);
                  setCalendarCursor(prev);
                  setShowMonthSelect(false);
                  setShowYearSelect(false);
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="chevron-back" size={22} color="#111827" />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { setShowMonthSelect(v => !v); setShowYearSelect(false); }} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                    {calendarCursor.toLocaleString(undefined, { month: 'long' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowYearSelect(v => !v); setShowMonthSelect(false); }} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                    {calendarCursor.getFullYear()}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const y = calendarCursor.getFullYear();
                  const m = calendarCursor.getMonth();
                  const next = new Date(y, m + 1, 1);
                  setCalendarCursor(next);
                  setShowMonthSelect(false);
                  setShowYearSelect(false);
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="chevron-forward" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Month selection grid */}
            {showMonthSelect && (
              <View style={{ marginBottom: 8 }}>
                {(() => {
                  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  const rows: React.ReactNode[] = [];
                  for (let r = 0; r < 3; r++) {
                    rows.push(
                      <View key={r} style={{ flexDirection: 'row', marginBottom: 6 }}>
                        {months.slice(r * 4, r * 4 + 4).map((label, idx) => {
                          const monthIndex = r * 4 + idx;
                          const isActive = monthIndex === calendarCursor.getMonth();
                          const isFutureMonth = (calendarCursor.getFullYear() === today.getFullYear()) && monthIndex > today.getMonth();
                          return (
                            <TouchableOpacity
                              key={label}
                              disabled={isFutureMonth}
                              onPress={() => {
                                const y = calendarCursor.getFullYear();
                                setCalendarCursor(new Date(y, monthIndex, 1));
                                setShowMonthSelect(false);
                              }}
                              style={{ flex: 1, paddingVertical: 10, marginHorizontal: 4, borderRadius: 8, backgroundColor: isFutureMonth ? '#E5E7EB' : (isActive ? '#2563eb' : '#F3F4F6'), alignItems: 'center' }}
                            >
                              <Text style={{ color: isFutureMonth ? '#9ca3af' : (isActive ? '#fff' : '#111827'), fontWeight: '700' }}>{label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  }
                  return <View>{rows}</View>;
                })()}
              </View>
            )}

            {/* Year selection list */}
            {showYearSelect && (
              <View style={{ marginBottom: 8, height: 200, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 }}>
                <ScrollView>
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const maxYear = Math.min(2025, currentYear);
                    const years: number[] = [];
                    for (let y = maxYear; y >= 1950; y--) years.push(y);
                    return years.map((y) => {
                      const isActive = y === calendarCursor.getFullYear();
                      return (
                        <TouchableOpacity
                          key={y}
                          onPress={() => {
                            const m = calendarCursor.getMonth();
                            setCalendarCursor(new Date(y, m, 1));
                            setShowYearSelect(false);
                          }}
                          style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: isActive ? '#2563eb' : 'transparent' }}
                        >
                          <Text style={{ color: isActive ? '#fff' : '#111827', fontWeight: isActive ? '700' : '600' }}>{y}</Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </ScrollView>
              </View>
            )}

            {/* Weekday headers */}
            {!showMonthSelect && !showYearSelect && (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                  <Text key={d} style={{ flex: 1, textAlign: 'center', color: '#6b7280', fontWeight: '600' }}>{d}</Text>
                ))}
              </View>
            )}

            {/* Dates grid */}
            {!showMonthSelect && !showYearSelect && (() => {
              const y = calendarCursor.getFullYear();
              const m = calendarCursor.getMonth();
              const firstDay = new Date(y, m, 1);
              const startWeekday = firstDay.getDay();
              const daysInMonth = new Date(y, m + 1, 0).getDate();
              const cells: (Date | null)[] = [];
              for (let i = 0; i < startWeekday; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
              while (cells.length % 7 !== 0) cells.push(null);
              while (cells.length < 42) cells.push(null);
              const rows: React.ReactNode[] = [];
              const today0 = new Date(today);
              today0.setHours(0,0,0,0);
              for (let r = 0; r < 6; r++) {
                rows.push(
                  <View key={r} style={{ flexDirection: 'row', marginBottom: 4 }}>
                    {cells.slice(r * 7, r * 7 + 7).map((date, idx) => {
                      const isSelected = !!date && tempDate &&
                        date.getFullYear() === tempDate.getFullYear() &&
                        date.getMonth() === tempDate.getMonth() &&
                        date.getDate() === tempDate.getDate();
                      const isDisabled = !date || (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() > today0.getTime());
                      return (
                        <TouchableOpacity
                          key={idx}
                          disabled={isDisabled}
                          onPress={() => date && !isDisabled && setTempDate(date)}
                          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: isSelected ? '#2563eb' : 'transparent' }}
                        >
                          <Text style={{ color: isSelected ? '#fff' : (isDisabled ? '#9ca3af' : '#111827'), fontWeight: '600' }}>
                            {date ? date.getDate() : '0'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              }
              return <View>{rows}</View>;
            })()}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ paddingVertical: 10, paddingHorizontal: 12, marginRight: 8 }}>
                <Text style={{ color: '#6b7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const today0 = new Date();
                  today0.setHours(0,0,0,0);
                  const sel0 = new Date(tempDate);
                  sel0.setHours(0,0,0,0);
                  const finalDate = sel0.getTime() > today0.getTime() ? today0 : sel0;
                  setBirthdate(finalDate);
                  setShowDatePicker(false);
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 12 }}
              >
                <Text style={{ color: '#2563eb', fontWeight: '700' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}