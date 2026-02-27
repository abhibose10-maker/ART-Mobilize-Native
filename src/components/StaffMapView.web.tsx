import React from 'react';
import { View, Text } from 'react-native';

type Props = {
  mapOverlayStyle: any;
  emptyTextStyle: any;
};

export default function StaffMapView({ mapOverlayStyle, emptyTextStyle }: Props) {
  return (
    <View style={[mapOverlayStyle, { position: 'relative', minHeight: 220 }]}>
      <Text style={emptyTextStyle}>
        Staff map is not available on web. Use Android/iOS app.
      </Text>
    </View>
  );
}
