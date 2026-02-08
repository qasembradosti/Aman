// New component to handle video player lifecycles correctly
import { useVideoPlayer, VideoView } from "expo-video";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useTheme } from "../utils/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function VideoSlide({ uri, width, height }) {
  const { theme } = useTheme();
  const [isMuted, setIsMuted] = useState(false);
  
  const player = useVideoPlayer(uri, player => {
    player.loop = true;
    player.play();
    player.muted = false;
  });

  const toggleMute = () => {
    if (player) {
      const newMutedState = !isMuted;
      player.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  return (
    <View style={{ width, height, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      <VideoView 
        style={{ width: '100%', height: '100%' }}
        player={player} 
        allowsPictureInPicture={false}
        nativeControls={false}
        contentFit="contain"
      />
      <TouchableOpacity 
        onPress={toggleMute}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          backgroundColor: 'rgba(0,0,0,0.6)',
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name={isMuted ? "volume-mute-outline" : "volume-high-outline"} size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}
