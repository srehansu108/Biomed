// src/hooks/useWebAuthn.js
import { useState } from 'react';
import { webauthnAPI } from '../services/api';

export const useWebAuthn = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper: Convert base64url to ArrayBuffer
  const base64UrlToBuffer = (base64url) => {
    try {
      if (!base64url) {
        throw new Error('No data provided');
      }

      let cleaned = base64url.trim();
      cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
      
      while (cleaned.length % 4 !== 0) {
        cleaned += '=';
      }
      
      const binary = atob(cleaned);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error('Failed to decode base64url:', error);
      throw new Error('Invalid base64 data');
    }
  };

  // Helper: Convert ArrayBuffer to base64url
  const bufferToBase64Url = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  // ✅ FIX: Get correct RP ID for current domain
  const getRPId = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'localhost';
    }
    if (hostname.includes('netlify.app')) {
      return 'biomed-auth.netlify.app';
    }
    return hostname;
  };

  // ✅ FIX: Get correct origin
  const getOrigin = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:${port || 3000}`;
    }
    return window.location.origin;
  };

  const registerBiometric = async (email, patientId) => {
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Get registration options from backend
      const optionsResponse = await webauthnAPI.getRegistrationOptions(email);
      const options = optionsResponse.data;

      // ✅ FIX: Override RP ID with correct domain
      const rpId = getRPId();
      if (options.rp) {
        options.rp.id = rpId;
      }

      // ✅ Store challenge for later use
      const challenge = options.challenge;

      // Validate required fields
      if (!challenge) {
        throw new Error('No challenge received from server');
      }

      // Step 2: Create credential using WebAuthn API
      const publicKey = {
        challenge: base64UrlToBuffer(challenge),
        rp: options.rp || { id: rpId, name: 'BioMed Pharmacy' },
        user: {
          id: base64UrlToBuffer(options.user.id),
          name: options.user.name,
          displayName: options.user.displayName || options.user.name,
        },
        pubKeyCredParams: options.pubKeyCredParams || [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKey,
      });

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      // Step 3: Prepare credential for verification
      const credentialData = {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
          attestationObject: bufferToBase64Url(credential.response.attestationObject),
        },
        authenticatorAttachment: credential.authenticatorAttachment,
      };

      // Step 4: Verify with backend
      const verification = await webauthnAPI.verifyRegistration({
        credential: credentialData,
        email: email,
      });

      setLoading(false);
      
      // ✅ FIX: Return proper response structure
      if (verification.data && verification.data.verified) {
        return {
          success: true,
          access_token: verification.data.access_token,
          patient_id: verification.data.patient_id || patientId,
          registration_complete: verification.data.registration_complete || false,
          message: verification.data.message || 'Registration successful'
        };
      } else {
        throw new Error(verification.data?.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Biometric registration error:', err);
      setError(err.message || 'Biometric registration failed');
      setLoading(false);
      return {
        success: false,
        message: err.message || 'Registration failed'
      };
    }
  };

  const loginBiometric = async (email) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get login options from backend
      const optionsResponse = await webauthnAPI.getLoginOptions(email);
      const options = optionsResponse.data;

      if (!options.challenge) {
        throw new Error('No challenge received from server');
      }

      // ✅ FIX: Use correct RP ID
      const rpId = getRPId();

      // Step 2: Build public key request
      const publicKey = {
        challenge: base64UrlToBuffer(options.challenge),
        rpId: options.rpId || rpId,
        timeout: options.timeout || 60000,
        userVerification: options.userVerification || 'required',
      };

      // Add allowCredentials if provided
      if (options.allowCredentials && options.allowCredentials.length > 0) {
        publicKey.allowCredentials = options.allowCredentials.map(cred => ({
          id: base64UrlToBuffer(cred.id),
          type: cred.type || 'public-key',
        }));
      }

      // Step 3: Get credential using WebAuthn API
      const credential = await navigator.credentials.get({
        publicKey: publicKey,
      });

      if (!credential) {
        throw new Error('Failed to get credential');
      }

      // Step 4: Prepare credential for verification
      const credentialData = {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
          authenticatorData: bufferToBase64Url(credential.response.authenticatorData),
          signature: bufferToBase64Url(credential.response.signature),
          userHandle: credential.response.userHandle 
            ? bufferToBase64Url(credential.response.userHandle)
            : null,
        },
      };

      // Step 5: Verify with backend
      const verification = await webauthnAPI.verifyLogin({
        credential: credentialData,
        email: email,
      });

      setLoading(false);
      
      // ✅ FIX: Properly return the response with 'success' flag
      if (verification.data && verification.data.verified) {
        return {
          success: true,
          access_token: verification.data.access_token,
          patient_id: verification.data.patient_id,
          registration_complete: verification.data.registration_complete || false
        };
      } else {
        throw new Error(verification.data?.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Biometric login error:', err);
      setError(err.message || 'Biometric login failed');
      setLoading(false);
      return {
        success: false,
        message: err.message || 'Login failed'
      };
    }
  };

  return {
    registerBiometric,
    loginBiometric,
    loading,
    error,
  };
};

export default useWebAuthn;