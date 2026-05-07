#!/usr/bin/env node
/* eslint-env node */

const fs = require('fs');
const path = require('path');

// Optimize gradle.properties for faster builds
const gradlePropsPath = path.join(__dirname, '../android/gradle.properties');
const optimizedProps = `# Project-wide Gradle settings
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
org.gradle.parallel=true
org.gradle.daemon=true
org.gradle.configureondemand=true
org.gradle.caching=true
android.useAndroidX=true
android.enableJetifier=true
android.enableR8.fullMode=false
android.enableBuildCache=true
android.enableSeparateAnnotationProcessing=true
kotlin.code.style=official
kotlin.incremental=true
kotlin.incremental.android=true
kotlin.incremental.java=true
kotlin.daemon.jvm.options=-Xmx2048m
# New architecture
newArchEnabled=true
# Expo configuration
expo.reactNativeDir=../node_modules/react-native
expo.jsEngine=hermes
expo.hermesCommand=../node_modules/react-native/sdks/hermesc/%OS-BIN%/hermesc
expo.hermesFlags=-O -output-source-map
# Development optimizations
android.enableSeparateDexedInstrumentationApks=false
android.enableDexingArtifactTransform=true
`;

if (fs.existsSync(gradlePropsPath)) {
  fs.writeFileSync(gradlePropsPath, optimizedProps);
  console.log('✅ Optimized gradle.properties for faster builds');
}

// Create Android Studio run configuration
const runConfigPath = path.join(__dirname, '../android/.idea/runConfigurations.xml');
const runConfig = `<?xml version="1.0" encoding="UTF-8"?>
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="app" type="AndroidRunConfigurationType" factoryName="Android App">
    <module name="AI.ttorney.app" />
    <option name="DEPLOY" value="true" />
    <option name="DEPLOY_APK_FROM_BUNDLE" value="false" />
    <option name="DEPLOY_AS_INSTANT" value="false" />
    <option name="ARTIFACT_NAME" value="" />
    <option name="PM_INSTALL_OPTIONS" value="" />
    <option name="ALL_USERS" value="false" />
    <option name="ALWAYS_INSTALL_WITH_PM" value="false" />
    <option name="DYNAMIC_FEATURES_DISABLED_LIST" value="" />
    <option name="ACTIVITY_EXTRA_FLAGS" value="" />
    <option name="MODE" value="default_activity" />
    <option name="CLEAR_LOGCAT" value="false" />
    <option name="SHOW_LOGCAT_AUTOMATICALLY" value="false" />
    <option name="SKIP_NOOP_APK_INSTALLATIONS" value="true" />
    <option name="FORCE_STOP_RUNNING_APP" value="true" />
    <option name="TARGET_SELECTION_MODE" value="DEVICE_AND_SNAPSHOT_COMBO_BOX" />
    <option name="SELECTED_CLOUD_MATRIX_CONFIGURATION_ID" value="-1" />
    <option name="SELECTED_CLOUD_MATRIX_PROJECT_ID" value="" />
    <option name="DEBUGGER_TYPE" value="Java" />
    <option name="USE_JAVA_AWARE_DEBUGGER" value="java" />
    <option name="USE_CUSTOM_LOADER" value="false" />
    <option name="CUSTOM_LOADER_CLASS_NAME" value="" />
    <option name="CUSTOM_LOADER_CLASSPATH" value="" />
    <option name="FROM_GRADLE_MODEL" value="true" />
    <option name="DEBUGGABLE_MODULE" value="app" />
    <option name="DEBUGGABLE_ANDROID_RUN_CONFIGURATION_KIND" value="MAIN_ACTIVITY" />
    <option name="COMMAND_LINE" value="" />
    <option name="SUPPRESS_STRING_FORMAT_VALIDATION" value="true" />
    <option name="INTENT_FILTER_CONFIGURATIONS" />
    <option name="ACTIVITY_CLASS" value="com.j24a.aittorney.MainActivity" />
    <option name="SEARCH_ACTIVITY_IN_GLOBAL_SCOPE" value="false" />
    <option name="EXTRA_ADDITIONAL_ANDROID_SUPPORT_PROJECTS" />
    <method v="2">
      <option name="Android.Gradle.BeforeRunTask" enabled="true" clearLogcat="true" isGradleManaged="true" specifiedName="" />
      <option name="com.jetbrains.cidr.cpp.CidrBuildBeforeRunTaskProvider$BuildBeforeRunTask" enabled="false" />
    </method>
  </configuration>
</component>
`;

// Ensure .idea directory exists
const ideaDir = path.dirname(runConfigPath);
if (!fs.existsSync(ideaDir)) {
  fs.mkdirSync(ideaDir, { recursive: true });
}

fs.writeFileSync(runConfigPath, runConfig);
console.log('✅ Created Android Studio run configuration');

console.log('\n🚀 Android optimization complete!');
console.log('📱 Run: npm run android:studio to open in Android Studio');
console.log('⚡ Builds are now optimized for speed');
