import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { colors, layout, radii, spacing } from '@/theme/tokens';

import { emergencyScenarios, scenarioLabels, type EmergencyScenario } from './emergencyGuidance';

type Props = {
  preview: boolean;
  onBack: () => void;
  onContinue: (scenario: EmergencyScenario) => void;
};

export function EmergencySelectionScreen({ preview, onBack, onContinue }: Props) {
  const [selected, setSelected] = useState<EmergencyScenario>();
  const [focused, setFocused] = useState<EmergencyScenario>();

  return (
    <Screen>
      <View style={styles.back}>
        <Button label="Quay lại" icon="arrow-left" variant="text" onPress={onBack} />
      </View>
      <View style={styles.group}>
        <AppText variant="screenTitle" accessibilityRole="header">Hướng dẫn khẩn cấp</AppText>
        <AppText tone="muted">Chọn tình huống gần nhất với việc bạn đã làm.</AppText>
      </View>

      {preview && (
        <Card>
          <AppText variant="control" tone="action">Dữ liệu mẫu · Chỉ dành cho phát triển</AppText>
        </Card>
      )}

      <View style={styles.group}>
        <AppText variant="sectionTitle" accessibilityRole="header">Bạn đã làm gì?</AppText>
        <View accessibilityRole="radiogroup" style={styles.group}>
          {emergencyScenarios.map((scenario) => {
            const checked = selected === scenario;
            return (
              <Pressable
                key={scenario}
                accessibilityRole="radio"
                accessibilityLabel={scenarioLabels[scenario]}
                accessibilityState={{ checked }}
                onFocus={() => setFocused(scenario)}
                onBlur={() => setFocused(undefined)}
                onPress={() => setSelected(scenario)}
                style={({ pressed }) => [
                  styles.option,
                  checked && styles.selected,
                  pressed && styles.pressed,
                  focused === scenario && styles.focused,
                ]}>
                <Icon
                  name={checked ? 'radiobox-marked' : 'radiobox-blank'}
                  color={checked ? colors.action : colors.muted}
                />
                <AppText variant="control" style={styles.label}>{scenarioLabels[scenario]}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        {selected === undefined && (
          <AppText variant="secondary" tone="muted">Chọn một tình huống để tiếp tục.</AppText>
        )}
        <Button
          label="Xem các bước cần làm"
          icon="arrow-right"
          disabled={selected === undefined}
          onPress={() => {
            if (selected !== undefined) onContinue(selected);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
  group: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radii.control,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
  },
  label: { flex: 1 },
  selected: { backgroundColor: colors.actionSurface, borderColor: colors.action },
  pressed: { backgroundColor: colors.supportSurface },
  focused: { outlineColor: colors.focus, outlineOffset: 2, outlineWidth: 2, outlineStyle: 'solid' },
});
