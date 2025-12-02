import React, { useRef, useEffect } from 'react';

const NeuroShaderCanvas = ({ audioBeat }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_beat;

      float random (in vec2 st) {
          return fract(sin(dot(st.xy,
                               vec2(12.9898,78.233)))
                       * 43758.5453123);
      }

      float noise (in vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);

          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));

          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) +
                  (c - a) * u.y * (1.0 - u.x) +
                  (d - b) * u.x * u.y;
      }

      #define OCTAVES 6
      float fbm (in vec2 st) {
          float value = 0.0;
          float amplitude = .5;
          for (int i = 0; i < OCTAVES; i++) {
              value += amplitude * noise(st);
              st *= 2.;
              amplitude *= .5;
          }
          return value;
      }

      void main() {
          vec2 st = gl_FragCoord.xy/u_resolution.xy;
          st.x *= u_resolution.x / u_resolution.y;

          vec2 q = vec2(0.);
          q.x = fbm( st + 0.00*u_time );
          q.y = fbm( st + vec2(1.0) );

          vec2 r = vec2(0.);
          float d = distance(st, u_mouse) * 5.0; // Multiply distance to localize effect
          float warp_factor = 2.0 / (d + 0.1); // Increased warp_factor to 2.0
          r.x = fbm( st + q + vec2(1.7,9.2) + 0.15*u_time + (u_mouse - st) * warp_factor );
          r.y = fbm( st + q + vec2(8.3,2.8) + 0.126*u_time + (u_mouse - st) * warp_factor );

          float f = fbm(st+r);

          // New, more vibrant color palette
          vec3 color = mix(vec3(0.1, 0.0, 0.3), // Deep purple
                           vec3(0.0, 0.5, 0.5), // Teal
                           clamp((f*f)*4.0,0.0,1.0));

          color = mix(color,
                      vec3(0.0,0.0,0.05),
                      clamp(length(q),0.0,1.0));

          color = mix(color,
                      vec3(1.0, 0.7, 0.8), // Warm pink highlights
                      clamp(length(r.x),0.0,1.0));
          
          // Add a pulse effect on the beat
          color += u_beat * 0.5;

          gl_FragColor = vec4( (f*f*f+.6*f*f+.5*f)*color, 1.0);
      }
    `;

    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
    const timeUniformLocation = gl.getUniformLocation(program, "u_time");
    const mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
    const beatUniformLocation = gl.getUniformLocation(program, "u_beat");

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = 1.0 - (e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', onMouseMove);

    const render = (time) => {
      time *= 0.001;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(timeUniformLocation, time);
      gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
      gl.uniform1f(beatUniformLocation, audioBeat ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [audioBeat]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />;
};

export default NeuroShaderCanvas;
