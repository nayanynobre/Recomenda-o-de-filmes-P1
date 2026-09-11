import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useColor } from '@/hooks/useColor';

interface SectionHeaderProps {
  title: string;
  onPressAction?: () => void;
}

export function SectionHeader({ title, onPressAction }: SectionHeaderProps) {
  const iconColor = useColor('textMuted');

  return (
    <View style={styles.container} pointerEvents='box-none'>
      {onPressAction ? (
        <TouchableOpacity
          onPress={onPressAction}
          style={styles.titleRow}
          accessibilityRole='button'
          accessibilityLabel={`Abrir categoria ${title}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.72}
        >
          <Text variant='title' style={styles.title}>
            {title}
          </Text>
          <View style={styles.actionButton}>
            <ChevronRight size={20} color={iconColor} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.titleRow}>
          <Text variant='title' style={styles.title}>
            {title}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  actionButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
