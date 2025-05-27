import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { decodeJwt } from '../lib/decodeJwt'; // adjust path if needed

const testToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6IndlYkBqb25jb2xsaW5zLmluZm8iLCJleHAiOjE3NDczMDI4NDh9.iJwfSO_lzGV1BxfsR2m4lZr8ET6TlvHNvPE06wjz0ao';

export default function TestDecode() {
  useEffect(() => {
    const decoded = decodeJwt(testToken);
    console.log('✅ Manually decoded JWT:', decoded);
  }, []);

  return (
    <View style={{ padding: 40 }}>
      <Text>Testing manual JWT decode...</Text>
    </View>
  );
}
