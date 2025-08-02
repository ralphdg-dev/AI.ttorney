import { View, Text, TextInput, TouchableOpacity, Image, Animated } from 'react-native';
import { Link, router } from 'expo-router';
import tw from 'tailwind-react-native-classnames';
import { useState, useRef } from 'react';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import logo from '../assets/images/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    // TODO: Implement login logic
    console.log('Login pressed');
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google login
    console.log('Google login pressed');
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Top Navigation */}
      <View style={tw`flex-row items-center px-6 pt-12 pb-4`}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={tw`p-2`}
        >
          <Ionicons name="arrow-back" size={24} color="#A0A0A0" />
        </TouchableOpacity>
      </View>

             {/* Main Content */}
       <View style={tw`flex-1 justify-center items-center px-6`}>
         {/* Logo Image */}
         <View style={tw`mb-0 -mt-16 items-center`}>
           <Image
             source={logo}
             style={tw`w-32 h-32 mb-1`}
             resizeMode="contain"
           />
        
         </View>

        {/* Login Form */}
        <View style={tw`w-full max-w-sm`}>
          {/* Email Input */}
          <View style={tw`mb-4`}>
            <Text style={[tw`font-bold mb-2`, { color: Colors.text.head }]}>
              Email
            </Text>
            <TextInput
              style={[
                tw`border border-gray-300 rounded-lg px-4 py-3 bg-white`,
                { color: Colors.text.head }
              ]}
              placeholder="Your email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={tw`mb-4`}>
            <Text style={[tw`font-bold mb-2`, { color: Colors.text.head }]}>
              Password
            </Text>
            <View style={tw`relative`}>
              <TextInput
                style={[
                  tw`border border-gray-300 rounded-lg px-4 py-3 bg-white pr-12`,
                  { color: Colors.text.head }
                ]}
                placeholder="Your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={tw`absolute right-3 top-3`}
              >
                <Ionicons 
                  name={showPassword ? "eye" : "eye-off"} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <TouchableOpacity 
              onPress={() => setRememberMe(!rememberMe)}
              style={tw`flex-row items-center`}
            >
              <View style={[
                tw`w-4 h-4 border rounded mr-2 items-center justify-center`,
                { 
                  borderColor: rememberMe ? Colors.primary.blue : '#D1D5DB',
                  backgroundColor: rememberMe ? Colors.primary.blue : 'transparent'
                }
              ]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={12} color="white" />
                )}
              </View>
              <Text style={[tw`text-sm`, { color: Colors.text.head }]}>
                Remember me
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity>
              <Text style={[tw`text-sm`, { color: Colors.primary.blue }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

                                {/* Login Button */}
           <TouchableOpacity
             style={[
               tw`py-3 rounded-lg items-center justify-center mb-3`,
               { backgroundColor: Colors.primary.blue }
             ]}
             onPress={handleLogin}
           >
             <Text style={tw`text-white font-semibold text-lg`}>
               Login
             </Text>
           </TouchableOpacity>

           {/* OR Separator */}
           <View style={tw`flex-row items-center mb-4`}>
             <View style={tw`flex-1 h-px bg-gray-300`} />
             <Text style={[tw`mx-4 text-sm`, { color: Colors.text.sub }]}>
               OR
             </Text>
             <View style={tw`flex-1 h-px bg-gray-300`} />
           </View>

           {/* Google Button */}
           <TouchableOpacity
             style={tw`py-3 rounded-lg items-center justify-center border border-gray-300 bg-white flex-row`}
             onPress={handleGoogleLogin}
           >
             <Text style={[tw`font-semibold text-lg`, { color: Colors.text.head }]}>
               Login with Google
             </Text>
           </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={tw`px-6 pb-8 items-center`}>
        <Text style={[tw`text-center`, { color: Colors.text.sub }]}>
          Don't have an account?{' '}
          <Text style={[tw`font-bold`, { color: Colors.primary.blue }]}>Sign Up</Text>
        </Text>
      </View>
    </View>
  );
} 