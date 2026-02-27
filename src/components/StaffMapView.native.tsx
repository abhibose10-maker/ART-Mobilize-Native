import React from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

type StaffLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  lastUpdate?: any;
};

type Props = {
  staffLocations: StaffLocation[];
  mapOverlayStyle: any;
  emptyTextStyle: any;
};

export default function StaffMapView({ staffLocations, mapOverlayStyle, emptyTextStyle }: Props) {
  const initialRegion =
    staffLocations.length > 0
      ? {
          latitude: staffLocations[0].latitude,
          longitude: staffLocations[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : {
          latitude: 19.076,
          longitude: 72.8777,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} initialRegion={initialRegion}>
        {staffLocations.map((staff) => (
          <Marker
            key={staff.id}
            coordinate={{ latitude: staff.latitude, longitude: staff.longitude }}
            title={staff.name}
            description={
              staff.lastUpdate
                ? `Last update: ${new Date(staff.lastUpdate.seconds * 1000).toLocaleString()}`
                : 'Location available'
            }
          />
        ))}
      </MapView>
      {staffLocations.length === 0 && (
        <View style={mapOverlayStyle}>
          <Text style={emptyTextStyle}>No staff locations available</Text>
        </View>
      )}
    </View>
  );
}
