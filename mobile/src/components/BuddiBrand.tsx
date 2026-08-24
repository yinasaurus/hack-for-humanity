import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors } from '../theme';
import {
  getBuddiBrandSpec,
  type BuddiBrandSize,
} from './buddiBrandSpec';

const BUDDI_LOGO = require('../../assets/buddi-logo.png');

export type BuddiBrandProps = {
  /**
   * `large` is used by the authentication screen; `regular` and `compact`
   * preserve the existing screen hierarchy everywhere else.
   */
  size?: BuddiBrandSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  logoStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

/**
 * Accessible Buddi icon + wordmark lockup.
 *
 * The outer view is one labelled header so assistive technologies announce
 * “Buddi” once, while the decorative image is excluded from the accessibility
 * tree. The image is a bundled static asset, which Expo supports directly via
 * require() (SDK 57 Asset docs).
 */
export function BuddiBrand({
  size = 'regular',
  style,
  textStyle,
  logoStyle,
  accessibilityLabel = 'Buddi',
}: BuddiBrandProps) {
  const spec = getBuddiBrandSpec(size);

  return (
    <View
      style={[styles.row, { gap: spec.gap }, style]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={BUDDI_LOGO}
        resizeMode="contain"
        style={[{ width: spec.iconSize, height: spec.iconSize }, logoStyle]}
        accessible={false}
        accessibilityIgnoresInvertColors
      />
      <Text
        style={[
          styles.wordmark,
          {
            fontSize: spec.textSize,
            lineHeight: spec.textLineHeight,
          },
          textStyle,
        ]}
        accessible={false}
        numberOfLines={1}
      >
        Buddi
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.sageDeep,
  },
});
