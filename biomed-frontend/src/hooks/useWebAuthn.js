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

      // Clean the string - remove whitespace
      let cleaned = base64url.trim();
      
      // Replace URL-safe characters
      cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      while (cleaned.length % 4 !== 0) {
        cleaned += '=';
      }
      
      // Decode base64
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

  const registerBiometric = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Get registration options from backend
      const optionsResponse = await webauthnAPI.getRegistrationOptions(email);
      const options = optionsResponse.data;

      // ✅ Store challenge ID for verification
      const challengeId = options.challengeId;

      // Validate required fields
      if (!options.challenge) {
        throw new Error('No challenge received from server');
      }

      // Step 2: Create credential using WebAuthn API
      const publicKey = {
        challenge: base64UrlToBuffer(options.challenge),
        rp: options.rp,
        user: {
          id: base64UrlToBuffer(options.user.id),
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams,
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

      // Step 3: Prepare credential for verification
      const credentialData = {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
          attestationObject: bufferToBase64Url(credential.response.attestationObject),
        },
        // ✅ Include challenge ID for backend lookup
        challenge_id: challengeId,
      };

      // Step 4: Verify with backend
      const verification = await webauthnAPI.verifyRegistration({
        credential: credentialData,
        email: email,
      });

      setLoading(false);
      return verification.data;
    } catch (err) {
      console.error('Biometric registration error:', err);
      setError(err.message || 'Biometric registration failed');
      setLoading(false);
      throw err;
    }
  };

  const loginBiometric = async (email) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get login options from backend
      const optionsResponse = await webauthnAPI.getLoginOptions(email);
      const options = optionsResponse.data;

      // ✅ Store challenge ID
      const challengeId = options.challengeId;

      if (!options.challenge) {
        throw new Error('No challenge received from server');
      }

      // Step 2: Get credential using WebAuthn API
      const publicKey = {
        challenge: base64UrlToBuffer(options.challenge),
        rpId: options.rpId || 'localhost',
        timeout: options.timeout || 60000,
        userVerification: options.userVerification || 'required',
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKey,
      });

      // Step 3: Prepare credential for verification
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
        // ✅ Include challenge ID
        challenge_id: challengeId,
      };

      // Step 4: Verify with backend
      const verification = await webauthnAPI.verifyLogin({
        credential: credentialData,
        email: email,
      });

      setLoading(false);
      return verification.data;
    } catch (err) {
      console.error('Biometric login error:', err);
      setError(err.message || 'Biometric login failed');
      setLoading(false);
      throw err;
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