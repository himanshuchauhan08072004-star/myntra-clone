import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart, ShoppingBag, ChevronLeft, Check } from "lucide-react-native";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { API_BASE_URL } from "@/constants/Api";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from "react-native-reanimated";

export default function ProductDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [selectedSize, setSelectedSize] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout>();
  const { user } = useAuth();
  const [product, setproduct] = useState<any>(null);
  const [iswishlist, setiswishlist] = useState(false);

  // ---- interactive motion values ----
  const scrollY = useSharedValue(0);
  const tiltX = useSharedValue(0); // rotateX (drag up/down)
  const tiltY = useSharedValue(0); // rotateY (drag left/right)
  const imageScale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const bagButtonScale = useSharedValue(1);
  const successProgress = useSharedValue(0);
  const sizeScales = useRef<Record<string, any>>({}).current;

  const getSizeScale = (size: string) => {
    if (!sizeScales[size]) sizeScales[size] = useSharedValue(1);
    return sizeScales[size];
  };

  useEffect(() => {
    const fetchproduct = async () => {
      try {
        setIsLoading(true);
        const product = await axios.get(`${API_BASE_URL}/product/${id}`);
        setproduct(product.data);
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchproduct();
  }, []);

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [product, currentImageIndex]);

  const startAutoScroll = () => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = setInterval(() => {
      if (product && scrollViewRef.current) {
        const nextIndex = (currentImageIndex + 1) % product.images.length;
        scrollViewRef.current.scrollTo({ x: nextIndex * width, animated: true });
        setCurrentImageIndex(nextIndex);
      }
    }, 3000);
  };

  // Drag-to-tilt "3D card" gesture on the hero image
  const tiltGesture = Gesture.Pan()
    .onBegin(() => {
      imageScale.value = withSpring(1.04);
    })
    .onUpdate((e) => {
      tiltY.value = interpolate(e.translationX, [-120, 120], [-12, 12], Extrapolation.CLAMP);
      tiltX.value = interpolate(e.translationY, [-120, 120], [10, -10], Extrapolation.CLAMP);
    })
    .onFinalize(() => {
      tiltX.value = withSpring(0);
      tiltY.value = withSpring(0);
      imageScale.value = withSpring(1);
    });

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
      { scale: imageScale.value },
    ],
  }));

  const scrollHandlerAnimated = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const headerBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 220], [0, 1], Extrapolation.CLAMP),
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const bagButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bagButtonScale.value }],
  }));

  const successOverlayStyle = useAnimatedStyle(() => ({
    opacity: successProgress.value,
    transform: [{ scale: interpolate(successProgress.value, [0, 1], [0.6, 1]) }],
  }));

  if (!product) {
    if (isLoading) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ff3f6c" />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <Text>Product not found</Text>
      </View>
    );
  }

  const handleAddwishlist = async () => {
    heartScale.value = withSequence(withSpring(1.4, { damping: 4 }), withSpring(1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/wishlist`, { userId: user._id, productId: id });
      setiswishlist(true);
      setTimeout(() => router.push("/wishlist"), 250);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSelectSize = (size: string) => {
    const s = getSizeScale(size);
    s.value = withSequence(withSpring(0.85), withSpring(1));
    Haptics.selectionAsync();
    setSelectedSize(size);
  };

  const handleAddToBag = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!selectedSize) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      bagButtonScale.value = withSequence(
        withTiming(1.03, { duration: 80 }),
        withTiming(0.97, { duration: 80 }),
        withTiming(1, { duration: 80 })
      );
      alert("Please select a size");
      return;
    }
    try {
      setLoading(true);
      bagButtonScale.value = withSpring(0.93);
      await axios.post(`${API_BASE_URL}/bag`, {
        userId: user._id,
        productId: id,
        size: selectedSize,
        quantity: 1,
      });
      bagButtonScale.value = withSpring(1);
      setAdded(true);
      successProgress.value = withTiming(1, { duration: 250 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.push("/bag"), 500);
    } catch (error) {
      console.log(error);
      bagButtonScale.value = withSpring(1);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const imageIndex = Math.round(contentOffset.x / width);
    setCurrentImageIndex(imageIndex);
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      startAutoScroll();
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.floatingHeader, headerBarStyle]} pointerEvents="none" />
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={22} color="#3e3e3e" />
      </TouchableOpacity>

      <Animated.ScrollView onScroll={scrollHandlerAnimated} scrollEventThrottle={16}>
        <View style={styles.carouselContainer}>
          <GestureDetector gesture={tiltGesture}>
            <Animated.View style={tiltStyle}>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {product.images.map((image: any, index: any) => (
                  <Image
                    key={index}
                    source={{ uri: image }}
                    style={[styles.productImage, { width }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </Animated.View>
          </GestureDetector>
          <View style={styles.pagination}>
            {product.images.map((_: any, index: any) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  currentImageIndex === index && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.tiltHint}>↔ drag photo to tilt</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>{product.brand}</Text>
              <Text style={styles.name}>{product.name}</Text>
            </View>
            <TouchableOpacity style={styles.wishlistButton} onPress={handleAddwishlist}>
              <Animated.View style={heartStyle}>
                <Heart
                  size={24}
                  color={iswishlist ? "#ff3f6c" : "#ccc"}
                  fill={iswishlist ? "#ff3f6c" : "none"}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{product.price}</Text>
            <Text style={styles.discount}>{product.discount}</Text>
          </View>

          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.sizeSection}>
            <Text style={styles.sizeTitle}>Select Size</Text>
            <View style={styles.sizeGrid}>
              {product.sizes.map((size: any) => {
                const scale = getSizeScale(size);
                const animStyle = useAnimatedStyle(() => ({
                  transform: [{ scale: scale.value }],
                }));
                return (
                  <Animated.View key={size} style={animStyle}>
                    <TouchableOpacity
                      style={[
                        styles.sizeButton,
                        selectedSize === size && styles.selectedSize,
                      ]}
                      onPress={() => handleSelectSize(size)}
                    >
                      <Text
                        style={[
                          styles.sizeText,
                          selectedSize === size && styles.selectedSizeText,
                        ]}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      <View style={styles.footer}>
        <Animated.View style={bagButtonStyle}>
          <TouchableOpacity
            style={[styles.addToBagButton, added && styles.addToBagButtonSuccess]}
            onPress={handleAddToBag}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : added ? (
              <Animated.View style={[styles.successRow, successOverlayStyle]}>
                <Check size={20} color="#fff" />
                <Text style={styles.addToBagText}>ADDED TO BAG</Text>
              </Animated.View>
            ) : (
              <>
                <ShoppingBag size={20} color="#fff" />
                <Text style={styles.addToBagText}>ADD TO BAG</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: "#fff",
    zIndex: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  carouselContainer: {
    position: "relative",
  },
  productImage: {
    height: 400,
  },
  pagination: {
    position: "absolute",
    bottom: 16,
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#fff",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tiltHint: {
    position: "absolute",
    top: 12,
    right: 14,
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3e3e3e",
    marginBottom: 10,
  },
  wishlistButton: {
    padding: 10,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  price: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3e3e3e",
    marginRight: 10,
  },
  discount: {
    fontSize: 16,
    color: "#ff3f6c",
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 20,
  },
  sizeSection: {
    marginBottom: 20,
  },
  sizeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3e3e3e",
    marginBottom: 10,
  },
  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sizeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedSize: {
    borderColor: "#ff3f6c",
    backgroundColor: "#fff4f4",
  },
  sizeText: {
    fontSize: 16,
    color: "#3e3e3e",
  },
  selectedSizeText: {
    color: "#ff3f6c",
  },
  footer: {
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  addToBagButton: {
    backgroundColor: "#ff3f6c",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  addToBagButtonSuccess: {
    backgroundColor: "#2ecc71",
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addToBagText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
